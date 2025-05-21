import { useEffect, useState } from 'react';
import { useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { Token, NativeCurrency, TradeType } from '@uniswap/sdk-core';
import { encodeAbiParameters, parseAbiParameters } from 'viem';

interface PoolInfo {
  token0: { symbol: string };
  token1: { symbol: string };
  fee: number;
}

interface RouteInfo {
  protocol: string;
  percent: number;
  pools: PoolInfo[];
}

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
    const [route, setRoute] = useState<RouteInfo[] | null>(null);
    const [priceImpact, setPriceImpact] = useState('');
    const [calldata, setCalldata] = useState(null);
    const [value, setValue] = useState('');
    const [to, setTo] = useState('');

    const chainId = useChainId();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

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
                    data.route.map((r: RouteInfo) => ({
                        protocol: r.protocol,
                        percent: r.percent,
                        pools: r.pools.map((p: PoolInfo) => ({
                            token0: p.token0.symbol,
                            token1: p.token1.symbol,
                            fee: p.fee,
                        })),
                    }))
                );
                setGasPrice(data.gasUsd);
                setPriceImpact(data.priceImpact);
                setCalldata(data.calldata);
                setValue(data.value);
                setTo(data.to);

            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('未知错误');
                }
                setPrice('');
                setRoute(null);
            } finally {
                setLoading(false);
            }
        };

        fetchPrice();
    }, [tokenIn, tokenOut, amount, tradeType, recipient]);

    async function executeSwap({
        permit,
    }: {
        permit?: {
            signature: `0x${string}`;
            permit: {
                token: `0x${string}`;
                amount: bigint;
                deadline: number;
                nonce: number;
                spender: `0x${string}`;
            };
        };
    }) {
        if (!walletClient) throw new Error('No wallet client available');
        if (!publicClient) throw new Error('No public client available');
        if (!chainId) throw new Error('No chainId available');
        if (!calldata) throw new Error('No calldata available');
        if (!to) throw new Error('No universal route address available');

        let finalCalldata = calldata as `0x${string}`;

        if (permit) {
            const encodedPermit = encodeAbiParameters(
                parseAbiParameters('address token, uint256 amount, uint256 nonce, uint256 deadline, address spender, bytes signature'),
                [
                    permit.permit.token,
                    permit.permit.amount,
                    BigInt(permit.permit.nonce),
                    BigInt(permit.permit.deadline),
                    permit.permit.spender,
                    permit.signature,
                ]
            );
            finalCalldata = `0x${encodedPermit.slice(2)}${(calldata as string).slice(2)}` as `0x${string}`;
        }

        const txHash = await walletClient.sendTransaction({
            to: to as `0x${string}`,
            data: finalCalldata as `0x${string}`,
            account: walletClient.account.address as `0x${string}`,
            value: value ? BigInt(value) : undefined,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        return receipt;
    }

    return { price, gasPrice, loading, error, route, priceImpact, calldata, value, executeSwap };
}