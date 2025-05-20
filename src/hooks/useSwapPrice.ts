import { useEffect, useState } from 'react';
import { Token, NativeCurrency, TradeType } from '@uniswap/sdk-core';

interface UseSwapPriceProps {
    tokenIn: Token | NativeCurrency | null;
    tokenOut: Token | NativeCurrency | null;
    amount: string;
    tradeType: TradeType;
    recipient: string;
}

export function useSwapPrice({
    tokenIn,
    tokenOut,
    amount,
    tradeType,
    recipient,
}: UseSwapPriceProps) {
    const [price, setPrice] = useState('');
    const [gasPrice, setGasPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [route, setRoute] = useState<any>(null);
    const [priceImpact, setPriceImpact] = useState('');

    useEffect(() => {
        if (!tokenIn || !tokenOut || !amount || Number(amount) <= 0 || !recipient) return;

        const fetchPrice = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('http://127.0.0.1:3001/api/quote', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        tokenIn,
                        tokenOut,
                        amount,
                        tradeType,
                        recipient,
                    }),
                });

                const data = await res.json();
                if (!res.ok) throw new Error(data.message || '报价失败');

                setPrice(data.quote);
                setRoute(
                    data.route.map((r: any) => ({
                        protocol: r.protocol,
                        percent: r.percent,
                        pools: r.pools.map((p: any) => ({
                            token0: p.token0.symbol,
                            token1: p.token1.symbol,
                            fee: p.fee,
                        })),
                    }))
                );
                setGasPrice(data.gasUsd);
                setPriceImpact(data.priceImpact);

            } catch (err: any) {
                setError(err.message);
                setPrice('');
                setRoute(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [tokenIn, tokenOut, amount, tradeType, recipient]);

    return { price, gasPrice, loading, error, route, priceImpact };
}