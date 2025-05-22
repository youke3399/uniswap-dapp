'use client';

import { useEffect, useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, usePublicClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useSwapStore } from '@/stores/swapStore';
import { usePermit2 } from '@/hooks/usePermit2';
import { useSwapPrice } from '@/hooks/useSwapPrice';
import { Token, TradeType } from '@uniswap/sdk-core';
import { formatBalance } from '@/libs/conversion';
import { formatUnits, parseUnits } from 'viem';

export default function SwapPage() {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [currentGasGwei, setCurrentGasGwei] = useState<string | null>(null);

    useEffect(() => {
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
    }, [publicClient]);

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

        approveStatus,
        swapStatus,
        setApproveStatus,
        setSwapStatus,

        swapError,
        setSwapError,
    } = state;

    // 防抖定时器引用
    const inputDebounceTimer = useRef<NodeJS.Timeout | null>(null);
    const outputDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // 计算价格
    const { price, route, gasPrice, priceImpact, loading: priceLoading, error: priceError, executeSwap } = useSwapPrice({
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
    }, [price, priceLoading, tradeType, setFromAmount, setToAmount]);

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

    // Permit2 hooks
    const {approveTokenForPermit2 } = usePermit2();

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
                        disabled={
                            priceLoading ||
                            swapStatus === 'pending' ||
                            !fromToken ||
                            !toToken ||
                            (fromToken && toToken && fromToken.symbol === toToken.symbol) ||
                            !fromAmount ||
                            Number(fromAmount) <= 0
                        }
                        onClick={async () => {
                            setSwapError(null);
                            if (!isConnected || !fromToken || !address) return;

                            const isNative = 'isNative' in fromToken && fromToken.isNative;
                            const amountRaw = parseUnits(fromAmount || '0', fromToken?.decimals ?? 18);
                            const token = !isNative ? (fromToken as Token & { address: `0x${string}` }) : null;

                            // ETH 情况：直接交换
                            if (isNative) {
                                setSwapStatus('pending');
                                try {
                                    await executeSwap({});
                                    setSwapStatus('done');
                                } catch (err) {
                                    console.error('ETH Swap Error', err);
                                    setSwapError('ETH 交换失败，请重试');
                                    setSwapStatus('idle');
                                }
                                return;
                            }

                            // 非 ETH 情况：先审查（approve）
                            if (!isNative && approveStatus === 'idle') {
                                setApproveStatus('pending');
                                try {
                                    // 这里调用 approveTokenForPermit2 进行授权
                                    await approveTokenForPermit2({
                                        token: token!,
                                        account: address as `0x${string}`,
                                        amount: amountRaw,
                                    });
                                    setApproveStatus('done');
                                } catch (err) {
                                    console.error('Approve Error', err);
                                    setSwapError('授权失败，请重试');
                                    setApproveStatus('idle');
                                }
                                return;
                            }

                            // 审查完成后：执行 permit 签名和交易
                            if (approveStatus === 'done') {
                                setSwapStatus('pending');
                                try {
                                    /* const permitData = await getSignatureTransferPermit({
                                        token: token!,
                                        owner: address as `0x${string}`,
                                        amount: amountRaw,
                                    }); */

                                    await executeSwap({
                                        /* permit: {
                                            signature: permitData.signature as `0x${string}`,
                                            permit: {
                                                token: permitData.permit.permitted.token,
                                                amount: permitData.permit.permitted.amount,
                                                deadline: permitData.permit.deadline,
                                                nonce: permitData.permit.nonce,
                                                spender: permitData.permit.spender,
                                            },
                                        }, */
                                    });

                                    setSwapStatus('done');
                                } catch (err) {
                                    console.error('签名或交易失败', err);
                                    setSwapError('签名或交易失败，请重试');
                                    setSwapStatus('idle');
                                }
                            }
                        }}>
                        {priceLoading
                            ? '获取价格中...'
                            : !isConnected
                                ? '连接钱包'
                                : !fromToken || !toToken
                                    ? (fromToken && toToken ? '加载中...' : '请选择代币')
                                    : (fromToken && toToken && fromToken.symbol === toToken.symbol)
                                        ? '请选择不同的代币'
                                        : !fromAmount || Number(fromAmount) <= 0
                                            ? '请输入数量'
                                            : approveStatus === 'idle'
                                                ? (('isNative' in fromToken && fromToken.isNative) ? '交换' : '审查')
                                                : '批准并交换'}
                    </Button>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 text-sm font-medium text-gray-600">
                    <div className="flex justify-between">
                        <span>当前Gas:</span>
                        <span>{currentGasGwei !== null ? `${currentGasGwei} Gwei` : '--'}</span>
                    </div>
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
                           {(route as unknown as {
                                protocol: string;
                                percent: number;
                                pools: { token0: string; token1: string; fee: number }[];
                            }[]).map((r, i) => (
                                <li key={i} className="text-xs leading-relaxed">
                                    <span>[{r.protocol}] {r.percent}%</span>{' '}
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

                {(priceError || swapError) && (
                    <div className="text-red-600 text-sm font-medium text-center mt-4">
                        {priceError || swapError}
                    </div>
                )}
            </div>
        </main>
    );
}
