import { useEffect, useState } from 'react';
import { usePublicClient } from 'wagmi';
import { Address, encodeFunctionData, decodeFunctionResult } from 'viem';
import { SwapDirection } from '@/types';

import { parseAbi } from 'viem';

const QUOTER_V2_ADDRESS = '0x5e55C9e631FAE526cd4B0526C4818D6e0a9eF0e3'; // Quoter contract address

const quoterAbi = parseAbi([
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountReceived, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
  'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
]);

export function useSwapPriceV3(
    fromToken: { address: Address; decimals: number } | null,
    toToken: { address: Address; decimals: number } | null,
    amount: string,
    direction: SwapDirection
) {
    const [price, setPrice] = useState<string>('');
    const [slippagePrice, setSlippagePrice] = useState<string>('');
    const [gasEstimate, setGasEstimate] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(false);
    const [priceImpact, setPriceImpact] = useState<number>(0);
    const client = usePublicClient();

    useEffect(() => {
        const fetchPrice = async () => {
            if (!client || !fromToken || !toToken || !amount || Number(amount) <= 0) {
                setPrice('');
                return;
            }

            try {
                setLoading(true);

                const fee = 3000; // TODO: Use dynamic fee or pass as a parameter
                const amountRaw = BigInt(Math.floor(Number(amount) * 10 ** (direction === 'from' ? fromToken.decimals : toToken.decimals)));

                let encodedData;
                if (direction === 'from') {
                    encodedData = encodeFunctionData({
                        abi: quoterAbi,
                        functionName: 'quoteExactInputSingle',
                        args: [{
                            tokenIn: fromToken.address,
                            tokenOut: toToken.address,
                            amountIn: amountRaw,
                            fee: fee,
                            sqrtPriceLimitX96: 0n
                        }]
                    });
                } else {
                    encodedData = encodeFunctionData({
                        abi: quoterAbi,
                        functionName: 'quoteExactOutputSingle',
                        args: [{
                            tokenIn: fromToken.address,
                            tokenOut: toToken.address,
                            amount: amountRaw,
                            fee: fee,
                            sqrtPriceLimitX96: 0n
                        }]
                    });
                }

                const result = await client.call({
                    to: QUOTER_V2_ADDRESS,
                    data: encodedData
                });

                if (!result.data) {
                    throw new Error('Call result data is undefined');
                }

                const [quotedAmount, sqrtPriceX96After, , estimatedGas] = decodeFunctionResult({
                    abi: quoterAbi,
                    functionName: direction === 'from' ? 'quoteExactInputSingle' : 'quoteExactOutputSingle',
                    data: result.data
                }) as [BigInt, BigInt, number, BigInt];

                const formatted = Number(quotedAmount) / 10 ** (direction === 'from' ? toToken.decimals : fromToken.decimals);
                setPrice(formatted.toFixed(6));

                // 计算 sqrtPriceX96After 对应的价格
                const priceAfter = (Number(sqrtPriceX96After) ** 2) / (2 ** 192);
                // 实际价格（交易前价格），根据 quote 结果反推
                const actualPrice = formatted / Number(amount);

                // 计算价格影响（百分比）
                const impact = Math.abs((priceAfter - actualPrice) / actualPrice) * 100;
                setPriceImpact(impact);

                const slippageBps = 50; // 0.5% slippage
                const slippageAmount = formatted * (1 - slippageBps / 10000);
                setSlippagePrice(slippageAmount.toFixed(6));

                // 自动滑点策略：基础0.5% + 价格影响 * 1.2
                const autoSlippage = 0.005 + (impact / 100) * 1.2;
                const slippageAmountWithImpact = formatted * (1 - autoSlippage);
                setSlippagePrice(slippageAmountWithImpact.toFixed(6));

                setGasEstimate(Number(estimatedGas));
            } catch (err) {
                console.error('Failed to fetch price', err);
                setPrice('');
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [client, fromToken, toToken, amount, direction]);

    return { price, slippagePrice, gasEstimate, priceImpact, loading };
}