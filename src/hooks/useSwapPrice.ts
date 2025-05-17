import { useEffect, useState } from 'react';
import { providers } from 'ethers';
import { usePublicClient, useChainId } from 'wagmi';
import { SwapDirection } from '@/types';
import { Token, NativeCurrency } from '@uniswap/sdk-core';
import { AlphaRouter } from '@uniswap/smart-order-router';
import { CurrencyAmount, TradeType } from '@uniswap/sdk-core';
import { fromReadableAmount } from '@/lib/conversion';
import JSBI from 'jsbi';

export function useSwapPrice(
    fromToken: Token | NativeCurrency | null,
    toToken: Token | NativeCurrency | null,
    amount: string,
    direction: SwapDirection
) {
    const [price, setPrice] = useState<string>('');
    const [slippagePrice, setSlippagePrice] = useState<string>('');
    const [gasPrice, setGasPrice] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [priceImpact, setPriceImpact] = useState<string>('');
    const client = usePublicClient();
    const chainId = useChainId();

    useEffect(() => {
        const fetchPrice = async () => {
            if (!client || !fromToken || !toToken || !amount || Number(amount) <= 0) {
                return;
            }

            try {
                setLoading(true);

                const amountRaw: JSBI = fromReadableAmount(
                    Number(amount),
                    direction === 'from' ? fromToken.decimals : toToken.decimals
                )

                console.log(client);
                const ethersProvider = new providers.JsonRpcProvider('https://mainnet.chainnodes.org/ef23b75d-7314-47b4-a45f-c59c448f54b5', chainId);
                const router = new AlphaRouter({ chainId, provider: ethersProvider });

                const currencyAmount = CurrencyAmount.fromRawAmount(
                    direction === 'from' ? fromToken : toToken,
                    amountRaw
                );

                const swapRoute = await router.route(
                    currencyAmount,
                    direction === 'from' ? toToken : fromToken,
                    direction === 'from' ? TradeType.EXACT_INPUT : TradeType.EXACT_OUTPUT,
                );

                if (!swapRoute) {
                    throw new Error('No route found');
                }

                console.log(swapRoute);

                setPrice(swapRoute.quote.toSignificant(6));

                if (swapRoute.estimatedGasUsedUSD) {
                    setGasPrice(swapRoute.estimatedGasUsedUSD.toSignificant(2));
                }
            } catch (err) {
                console.error('Failed to fetch price', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [client, fromToken, toToken, amount, direction]);

    return { price, slippagePrice, gasPrice, priceImpact, loading };
}