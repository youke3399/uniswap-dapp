import { useEffect, useState } from 'react';
import JSBI from 'jsbi';
import { usePublicClient } from 'wagmi';
import { encodeFunctionData, decodeFunctionResult, parseAbi } from 'viem';
import { parseUnits, formatUnits, formatGwei } from 'viem';
import { Token } from '@uniswap/sdk-core';
import { tickToPrice, TickMath } from '@uniswap/v3-sdk';
import { SwapDirection } from '@/types';


const QUOTER_ADDRESS = '0x5e55C9e631FAE526cd4B0526C4818D6e0a9eF0e3'; // Quoter contract address

const quoterAbi = parseAbi([
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountReceived, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
    'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
]);

export function useSwapPriceV3(
    fromToken: Token & { address: `0x${string}` } | null,
    toToken: Token & { address: `0x${string}` } | null,
    amount: string,
    direction: SwapDirection
) {
    const [price, setPrice] = useState<string>('');
    const [slippagePrice, setSlippagePrice] = useState<string>('');
    const [gasPrice, setGasPrice] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [priceImpact, setPriceImpact] = useState<string>('');
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
                const amountRaw = parseUnits(amount, direction === 'from' ? fromToken.decimals : toToken.decimals);

                let encodedData;
                let fromAddress: `0x${string}` = fromToken.address;
                let toAddress: `0x${string}` = toToken.address;
                if (fromToken.symbol == 'ETH') {
                    fromAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`; // 换成weth
                }
                if (toToken.symbol == 'ETH') {
                    toAddress = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as `0x${string}`; // 换成weth
                }
                if (direction === 'from') {
                    encodedData = encodeFunctionData({
                        abi: quoterAbi,
                        functionName: 'quoteExactInputSingle',
                        args: [{
                            tokenIn: fromAddress,
                            tokenOut: toAddress,
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
                            tokenIn: fromAddress,
                            tokenOut: toAddress,
                            amount: amountRaw,
                            fee: fee,
                            sqrtPriceLimitX96: 0n
                        }]
                    });
                }

                const result = await client.call({
                    to: QUOTER_ADDRESS,
                    data: encodedData
                });

                if (!result.data) {
                    throw new Error('Call result data is undefined');
                }

                const [quotedAmount, sqrtPriceX96After] = decodeFunctionResult({
                    abi: quoterAbi,
                    functionName: direction === 'from' ? 'quoteExactInputSingle' : 'quoteExactOutputSingle',
                    data: result.data
                }) as readonly [bigint, bigint];

                const formatted = parseFloat(formatUnits(quotedAmount, direction === 'from' ? toToken.decimals : fromToken.decimals));
                setPrice(formatted.toFixed(6));

                // 计算 sqrtPriceX96After 对应的价格，并根据 token 精度调整
                const sqrtPriceX96 = JSBI.BigInt(sqrtPriceX96After.toString());
                const tick = TickMath.getTickAtSqrtRatio(sqrtPriceX96);
                const priceObj = direction === 'from' ? tickToPrice(fromToken, toToken, tick) : tickToPrice(toToken, fromToken, tick);
                const priceAfter = parseFloat(priceObj.toSignificant(6));

                // 实际价格（交易前价格），根据 quote 结果反推
                const actualPrice = formatted / Number(amount);

                // 计算价格影响（百分比）
                const impact = Math.abs((priceAfter - actualPrice) / actualPrice) * 100;
                setPriceImpact(impact.toFixed(2));

                // 自动滑点策略：基础0.5% + 价格影响 * 1.2
                let autoSlippage = 0.5
                if (impact >= autoSlippage) {
                    autoSlippage = impact * 1.2;
                }
                setSlippagePrice(autoSlippage.toFixed(2));

                // const eGas = Number(estimatedGas) / 10 ** 18; // estimatedGas始终返回0n
                const gasPrice = await client.getGasPrice();
                setGasPrice(parseFloat(formatGwei(gasPrice)).toFixed(3));
            } catch (err) {
                console.error('Failed to fetch price', err);
                setPrice('');
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [client, fromToken, toToken, amount, direction]);

    return { price, slippagePrice, gasPrice, priceImpact, loading };
}