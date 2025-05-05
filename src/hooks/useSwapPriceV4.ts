import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Address, encodeFunctionData, parseAbi, decodeFunctionResult } from 'viem';
import { SwapDirection } from '@/types';

const QUOTER_V4_ADDRESS = '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203'; // v4 Quoter合约地址

const quoterAbi = parseAbi([
    'function quoteExactInputSingle((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint256 exactAmount, bytes hookData) view returns (uint256 amountOut, uint256 gasEstimate)',
    'function quoteExactOutputSingle((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, bool zeroForOne, uint256 exactAmount, bytes hookData) view returns (uint256 amountIn, uint256 gasEstimate)'
]);

export function useSwapPrice(
    fromToken: { address: Address; decimals: number } | null,
    toToken: { address: Address; decimals: number } | null,
    amount: string,
    direction: SwapDirection
) {
    const [price, setPrice] = useState<string>('');
    const [slippagePrice, setSlippagePrice] = useState<string>('');
    const [gasEstimate, setGasEstimate] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const client = usePublicClient();

    const tickSpacingMap = { 500: 10, 3000: 60, 10000: 200 };


    useEffect(() => {
        const fetchPrice = async () => {
            if (!client || !fromToken || !toToken || !amount || Number(amount) <= 0) {
                setPrice('');
                return;
            }

            try {
                setLoading(true);

                const fee = 3000; // TODO: 替换成动态fee或传入参数
                const amountRaw = BigInt(Math.floor(Number(amount) * 10 ** (direction === 'from' ? fromToken.decimals : toToken.decimals)));

                let encodedData: `0x${string}`;
                let functionName: 'quoteExactInputSingle' | 'quoteExactOutputSingle';

                const tickSpacing = tickSpacingMap[fee];

                if (direction === 'from') {
                    functionName = 'quoteExactInputSingle';
                    encodedData = encodeFunctionData({
                        abi: quoterAbi,
                        functionName,
                        args: [
                            {
                                currency0: fromToken.address,
                                currency1: toToken.address,
                                fee: fee,
                                tickSpacing: tickSpacing,
                                hooks: '0x0000000000000000000000000000000000000000'
                            },
                            true,
                            amountRaw,
                            '0x'
                        ]
                    });
                } else {
                    functionName = 'quoteExactOutputSingle';
                    encodedData = encodeFunctionData({
                        abi: quoterAbi,
                        functionName,
                        args: [
                            {
                                currency0: fromToken.address,
                                currency1: toToken.address,
                                fee: fee,
                                tickSpacing: tickSpacing,
                                hooks: '0x0000000000000000000000000000000000000000'
                            },
                            true,
                            amountRaw,
                            '0x'

                        ]
                    });
                }

                const result = await client.call({
                    to: QUOTER_V4_ADDRESS,
                    data: encodedData
                });

                if (!result.data) {
                    throw new Error('Call result data is undefined');
                }

                const [quotedAmount, gasEstimate] = decodeFunctionResult({
                    abi: quoterAbi,
                    functionName,
                    data: result.data
                }) as [bigint, bigint];

                const formatted = Number(quotedAmount) / 10 ** (direction === 'from' ? toToken.decimals : fromToken.decimals);
                setPrice(formatted.toFixed(6));

                const slippageBps = 50; // 0.5% slippage
                const slippageAmount = formatted * (1 - slippageBps / 10000);
                setSlippagePrice(slippageAmount.toFixed(6));

                setGasEstimate(Number(gasEstimate));
            } catch (err) {
                console.error('Failed to fetch price', err);
                setPrice('');
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [client, fromToken, toToken, amount, direction]);

    return { price, slippagePrice, gasEstimate, loading };
}