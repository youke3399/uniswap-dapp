'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useWalletClient, usePublicClient } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useSwapStore } from '@/stores/swapStore';
import { useSwapPrice } from '@/hooks/useSwapPrice';
import { usePermit2 } from '@/hooks/usePermit2';
import { useUniversalRouter } from '@/hooks/useUniversalRouter';



export default function SwapPage() {
    const { address, isConnected } = useAccount();
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    if (!publicClient) {
        console.error('publicClient 未初始化');
        return <div>加载中...</div>;
    }

    const state = useSwapStore();
    const {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        amount,
        inputSource,
        approveStatus,
        errorMessage,
        setFromToken,
        setToToken,
        setFromAmount,
        setToAmount,
        setAmount,
        setInputSource,
        setApproveStatus,
        setErrorMessage,
        availableTokens,
    } = state;

    const [allowance, setAllowance] = useState<{
        amount: bigint;
        expiration: number;
        nonce: number;
    } | null>(null);

    const { checkAllowance, getPermitSignature } = usePermit2();
    const { executeSwap } = useUniversalRouter();

    // 计算价格
    const { price, slippagePrice, gasPrice, priceImpact, loading: priceLoading } = useSwapPrice(
        fromToken,
        toToken,
        amount,
        inputSource
    );

    // 根据价格变化自动填充 toAmount 或 fromAmount
    useEffect(() => {
        if (!priceLoading && price) {
            if (inputSource === 'from') {
                setToAmount(price);
            } else if (inputSource === 'to') {
                setFromAmount(price);
            }
        }
    }, [price, priceLoading, inputSource]);

    // 新增逻辑：判断是否原生 ETH
    const isFromNativeETH = fromToken && 'isNative' in fromToken && fromToken.isNative;
    const isToNativeETH = toToken && 'isNative' in toToken && toToken.isNative;

    // 获取出售代币余额
    const { data: fromTokenBalance, isFetching: isFetchingFromBalance } = useBalance({
        address,
        token: fromToken && 'address' in fromToken ? fromToken.address as `0x${string}` : undefined,
        query: { enabled: Boolean(address && fromToken) },
    });

    // 获取购买代币余额
    const { data: toTokenBalance, isFetching: isFetchingToBalance } = useBalance({
        address,
        token: toToken && 'address' in toToken ? toToken.address as `0x${string}` : undefined,
        query: { enabled: Boolean(address && toToken) },
    });

    useEffect(() => {
        const fetchAllowance = async () => {
            if (address && fromToken) {
                const isNativeETH = 'isNative' in fromToken && fromToken.isNative;
                if (isNativeETH) {
                    // ETH 无需授权
                    setApproveStatus('done');
                    return;
                }
               /*  try {
                    const result = await checkAllowance(address, fromToken);
                    setAllowance(result);

                    if (result.amount >= BigInt(1e30)) {
                        setApproveStatus('done');
                    } else {
                        setApproveStatus('idle');
                    }
                } catch (err: any) {
                    console.error('检查授权失败:', err);
                    setErrorMessage(err.message || '检查授权失败');
                } */
            }
        };
        fetchAllowance();
    }, [address, fromToken, checkAllowance]);

    const handleApprove = async () => {
        if (!fromToken || !address || !walletClient) {
            setErrorMessage('未选择代币或未连接钱包');
            return;
        }

        const isNativeETH = 'isNative' in fromToken && fromToken.isNative;
        if (isNativeETH) {
            alert('ETH 无需授权');
            setApproveStatus('done');
            return;
        }

        /* try {
            setApproveStatus('pending');
            setErrorMessage(null);

            // 获取签名
            if (!allowance) throw new Error('缺少授权信息');
            const permitData = await getPermitSignature({
                token: fromToken,
                owner: address,
                nonce: allowance.nonce,
            });

            console.log('Permit 签名完成:', permitData.signature);
            alert('授权签名完成，可以用于后续交易');
            setApproveStatus('done');
        } catch (err: any) {
            console.error(err);
            setErrorMessage(err.message || '授权失败');
            setApproveStatus('idle');
        } */
    };

    const handleSwap = async () => {
        console.log('是否原生 ETH 输入:', isFromNativeETH);
        // console.log('是否原生 ETH 输出:', isToNativeETH);

        if (!isConnected) {
            alert('请先连接钱包');
            return;
        }
        if (!fromToken || !toToken || !address || !publicClient || !walletClient) {
            alert('未选择代币或未连接钱包');
            return;
        }

        const isNativeETH = 'isNative' in fromToken && fromToken.isNative;

        if (!isNativeETH) {
            /* try {
                setApproveStatus('pending');
                const allowance = await checkAllowance(address, fromToken);

                if (allowance.amount < BigInt(1e30)) {
                    alert('授权额度不足，请先授权');
                    setApproveStatus('idle');
                    return;
                }

                setApproveStatus('done');
            } catch (err: any) {
                console.error(err);
                setErrorMessage(err.message || '检查授权失败');
                return;
            } */
        }

        /* try {
            const commands = '0x'; // 这里应该生成 swap 所需的指令数据
            const inputs: `0x${string}`[] = []; // 这里应该生成 swap 所需的输入数据

            setApproveStatus('pending');
            const receipt = await executeSwap({
                commands,
                inputs,
                isFromNativeETH,
                isToNativeETH: toToken && 'isNative' in toToken && toToken.isNative,
            });

            console.log('Swap 成功:', receipt);
            alert('交易完成');
            setApproveStatus('done');
        } catch (err: any) {
            console.error('Swap 失败:', err);
            setErrorMessage(err.message || 'Swap 失败');
            setApproveStatus('idle');
        } */
    };

    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen bg-gray-900 p-6">
            {/* Wallet connect button top-right */}
            <div className="absolute top-4 right-4">
                <ConnectButton />
            </div>

            <h1 className="text-3xl font-bold mb-6 text-white">交易</h1>

            <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-6 space-y-6">
                <div className="flex flex-col gap-y-3 text-white">
                    {/* Sell Token */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300">出售代币</label>
                        <div className="flex items-center border border-gray-700 rounded-md p-2 space-x-2 bg-gray-900">
                            <input
                                type="number"
                                value={fromAmount}
                                onChange={(e) => {
                                    setInputSource('from'); // 记录“用户改了 from”
                                    setAmount(e.target.value);
                                    setFromAmount(e.target.value);
                                }}
                                placeholder="输入数量"
                                className="flex-1 bg-transparent outline-none placeholder-gray-500 text-sm text-white focus:ring-2 focus:ring-yellow-400 rounded-md p-1"
                            />
                            <select
                                value={fromToken ? fromToken.symbol : ''}
                                onChange={(e) => {
                                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                                    if (selected) setFromToken(selected);
                                }}
                                className="bg-transparent outline-none text-sm text-white rounded-md p-1"
                            >
                                {availableTokens.map(token => (
                                    <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                                ))}
                            </select>
                        </div>
                        <div className="text-xs text-gray-400 text-right mt-1">
                            余额: {isFetchingFromBalance ? '加载中...' : fromTokenBalance ? `fromTokenBalance.value` : '--'}
                        </div>
                    </div>

                    {/* Buy Token */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300">购买代币</label>
                        <div className="flex items-center border border-gray-700 rounded-md p-2 space-x-2 bg-gray-900">
                            <input
                                type="number"
                                value={toAmount}
                                onChange={(e) => {
                                    setInputSource('to'); // 记录“用户改了 to”
                                    setAmount(e.target.value);
                                    setToAmount(e.target.value);
                                }}
                                placeholder="得到数量"
                                className="flex-1 bg-transparent outline-none placeholder-gray-500 text-sm text-white focus:ring-2 focus:ring-yellow-400 rounded-md p-1"
                            />
                            <select
                                value={toToken ? toToken.symbol : ''}
                                onChange={(e) => {
                                    const selected = availableTokens.find(t => t.symbol === e.target.value);
                                    if (selected) setToToken(selected);
                                }}
                                className="bg-transparent outline-none text-sm text-white rounded-md p-1"
                            >
                                {availableTokens
                                    .filter(token => token.symbol !== fromToken?.symbol)
                                    .map(token => (
                                        <option key={token.symbol} value={token.symbol}>{token.symbol}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="text-xs text-gray-400 text-right mt-1">
                            余额: {isFetchingToBalance ? '加载中...' : toTokenBalance ? `toTokenBalance.value` : '--'}
                        </div>
                    </div>
                </div>

                {allowance !== null && (
                    <div className="text-xs text-gray-400 text-right mt-1">
                        授权额度: {Number(allowance.amount) / 10 ** (fromToken ? fromToken.decimals : 18)}
                    </div>
                )}

                <div className="flex flex-col gap-y-3">
                    <Button
                        onClick={handleApprove}
                        disabled={approveStatus === 'pending' || !isConnected}
                        className={`w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed`}
                    >
                        {approveStatus === 'pending' ? '授权中...' : '授权 Permit2'}
                    </Button>

                    {/* Swap Button */}
                    <Button
                        onClick={handleSwap}
                        className={`w-full disabled:bg-gray-600 disabled:cursor-not-allowed`}
                        disabled={priceLoading || approveStatus === 'pending'}
                    >
                        {priceLoading ? '获取价格中...'
                            : isConnected ? (approveStatus === 'pending' ? '交易中...' : '交换') : '连接钱包'}
                    </Button>
                </div>

                {/* Info Rows */}
                <div className="space-y-2 text-sm font-medium text-gray-300">
                    <div className="flex justify-between">
                        <span>Gas:</span>
                        <span>{gasPrice} Gwei</span>
                    </div>
                    <div className="flex justify-between">
                        <span>价格影响:</span>
                        <span>{priceImpact}%</span>
                    </div>
                    <div className="flex justify-between">
                        <span>滑点容忍度:</span>
                        <span>{slippagePrice}%</span>
                    </div>
                </div>

                {errorMessage && (
                    <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
                )}
            </div>
        </main>
    );
}