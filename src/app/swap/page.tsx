'use client';

import { useEffect, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useSwapStore } from '@/stores/swapStore';
import { useSwapPrice } from '@/hooks/useSwapPrice';
import { TradeType } from '@uniswap/sdk-core';
import { formatBalance } from '@/libs/conversion';
import { formatUnits } from 'viem';


export default function SwapPage() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    // const [currentGasGwei, setCurrentGasGwei] = useState<string | null>(null);

    /* useEffect(() => {
        if (!publicClient) return;
        const fetchGas = async () => {
            try {
                const gas = await publicClient.getGasPrice();
                const gasGwei = Number(gas) / 1e9;
                setCurrentGasGwei(gasGwei.toFixed(6));
            } catch (error) {
                console.error('获取 Gas 失败:', error);
            }
        };

        fetchGas(); // 初始获取一次

        const interval = setInterval(fetchGas, 10000); // 每 10 秒轮询一次

        return () => clearInterval(interval); // 组件卸载时清除定时器
    }, [publicClient]); */

    const state = useSwapStore();
    const {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        amount,
        tradeType,
        availableTokens,
        setFromToken,
        setToToken,
        setFromAmount,
        setToAmount,
        setAmount,
        setTradeType,
    } = state;

    // 防抖定时器引用
    const inputDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const outputDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 计算价格
    const { price, route, gasPrice, priceImpact, loading: priceLoading, error: priceError } = useSwapPrice({
        tokenIn: fromToken,
        tokenOut: toToken,
        amount,
        tradeType,
        recipient: address || '',
    });

    // 根据价格变化自动填充 toAmount 或 fromAmount
    useEffect(() => {
        if (!priceLoading && price) {
            if (tradeType === TradeType.EXACT_INPUT) {
                setToAmount(price);
            } else if (tradeType === TradeType.EXACT_OUTPUT) {
                setFromAmount(price);
            }
        }
    }, [price, priceLoading, tradeType]);

    // 获取出售代币余额
    const { data: fromTokenBalance, isFetching: isFetchingFromBalance } = useBalance({
        address,
        token: fromToken && 'address' in fromToken ? fromToken.address as `0x${string}` : undefined,
    });

    // 获取购买代币余额
    const { data: toTokenBalance, isFetching: isFetchingToBalance } = useBalance({
        address,
        token: toToken && 'address' in toToken ? toToken.address as `0x${string}` : undefined,
    });

    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen bg-white p-6">
            {/* Wallet connect button top-right */}
            <div className="absolute top-4 right-4">
                <ConnectButton />
            </div>

            <h1 className="text-3xl font-bold mb-6 text-black">交易</h1>

            <div className="w-full max-w-md bg-gray-100 rounded-lg shadow-lg p-6 space-y-6">
                <div className="flex flex-col gap-y-3 text-black">
                    {/* Sell Token */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600">出售代币</label>
                        <div className="flex items-center border border-gray-300 rounded-md p-2 space-x-2 bg-white">
                            <input
                                type="number"
                                value={fromAmount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTradeType(TradeType.EXACT_INPUT); // 用户设置出售数量
                                    setFromAmount(val);
                                    if (inputDebounceTimer.current) clearTimeout(inputDebounceTimer.current);
                                    inputDebounceTimer.current = setTimeout(() => {
                                        setAmount(val);
                                    }, 500);
                                }}
                                placeholder="输入数量"
                                className="flex-1 bg-transparent outline-none placeholder-gray-600 text-sm text-black focus:ring-2 focus:ring-yellow-400 rounded-md p-1"
                            />
                            <select
                                value={fromToken ? fromToken.symbol : ''}
                                onChange={(e) => {
                                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                                    if (selected) setFromToken(selected);
                                }}
                                className="bg-transparent outline-none text-sm text-black rounded-md p-1"
                            >
                                {availableTokens.map(token => (
                                    <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-xs text-gray-600 text-right mt-1">
                            余额: {isFetchingFromBalance ? '加载中...' : formatBalance(formatUnits(fromTokenBalance?.value || 0n, fromToken?.decimals || 18))}
                        </div>
                    </div>

                    {/* Buy Token */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600">购买代币</label>
                        <div className="flex items-center border border-gray-300 rounded-md p-2 space-x-2 bg-white">
                            <input
                                type="number"
                                value={toAmount}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setTradeType(TradeType.EXACT_OUTPUT); // 用户设置购买数量
                                    setToAmount(val);
                                    if (outputDebounceTimer.current) clearTimeout(outputDebounceTimer.current);
                                    outputDebounceTimer.current = setTimeout(() => {
                                        setAmount(val);
                                    }, 500);
                                }}
                                placeholder="得到数量"
                                className="flex-1 bg-transparent outline-none placeholder-gray-600 text-sm text-black focus:ring-2 focus:ring-yellow-400 rounded-md p-1"
                            />
                            <select
                                value={toToken ? toToken.symbol : ''}
                                onChange={(e) => {
                                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                                    if (selected) setToToken(selected);
                                }}
                                className="bg-transparent outline-none text-sm text-black rounded-md p-1"
                            >
                                {availableTokens
                                    .filter(token => token.symbol !== fromToken?.symbol)
                                    .map(token => (
                                        <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="text-xs text-gray-600 text-right mt-1">
                            余额: {isFetchingToBalance ? '加载中...' : formatBalance(formatUnits(toTokenBalance?.value || 0n, toToken?.decimals || 18))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-y-3">

                    {/* Swap Button */}
                    <Button
                        className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed`}
                        disabled={priceLoading}
                    >
                        {priceLoading ? '获取价格中...'
                            : isConnected ? '交换' : '连接钱包'}
                    </Button>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 text-sm font-medium text-gray-600">
                    {/* <div className="flex justify-between">
                        <span>当前Gas:</span>
                        <span>{currentGasGwei !== null ? `${currentGasGwei} Gwei` : '--'}</span>
                    </div> */}
                    {gasPrice && (
                        <div className="flex justify-between">
                            <span>网络费用:</span>
                            <span>${Number(gasPrice).toFixed(6)}</span>
                        </div>
                    )}
                    {priceImpact && (
                        <div className="flex justify-between">
                            <span>价格影响:</span>
                            <span>{priceImpact}%</span>
                        </div>
                    )}
                </div>

                {route && route.length > 0 && (
                    <div className="text-sm font-medium text-gray-600">
                        <div>订单路由：</div>
                        <ul className="mt-1 space-y-2">
                            {route.map((r: { protocol: string; percent: number; pools: { token0: string; token1: string; fee: number }[] }, i: number) => (
                                <li key={i} className="text-xs leading-relaxed">
                                    <span>[{r.protocol}] {r.percent}%</span>
                                    {' '}
                                    {r.pools.map((p, j) => (
                                        <span key={j} className="ml-1 text-gray-600">
                                            {p.token0} → {p.token1} ({(p.fee / 10000)}%) {j < r.pools.length - 1 ? '|' : ''}
                                        </span>
                                    ))}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {priceError && (
                    <div className="text-red-500 text-sm mt-4 text-center font-medium">
                        {priceError}
                    </div>
                )}
            </div>
        </main>
    );
}
