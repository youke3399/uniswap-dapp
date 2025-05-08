'use client';

import { useEffect, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance, useWalletClient, usePublicClient } from 'wagmi';
import { Token } from '@uniswap/sdk-core';

import { formatUnits } from 'viem';
import { Button } from '@/components/ui/button';
import { availableTokens, useSwapStore } from '@/stores/swapStore';
import { useSwapPriceV3 } from '@/hooks/useSwapPriceV3';
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
    const { fromToken, toToken, fromAmount, toAmount, amount, inputSource, approveStatus, errorMessage } = state;
    const { setFromToken, setToToken, setFromAmount, setToAmount, setAmount, setInputSource, setApproveStatus, setErrorMessage } = state;

    const [allowance, setAllowance] = useState<{
        amount: bigint;
        expiration: number;
        nonce: number;
    } | null>(null);

    const { checkAllowance, getPermitSignature } = usePermit2();
    const { executeSwap } = useUniversalRouter();

    // 计算价格
    const { price, slippagePrice, gasPrice, priceImpact, loading: priceLoading } = useSwapPriceV3(
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
    const isFromNativeETH = fromToken?.symbol === 'ETH' && fromToken?.address === '0x0000000000000000000000000000000000000000';
    const isToNativeETH = toToken?.symbol === 'ETH' && toToken?.address === '0x0000000000000000000000000000000000000000';

    useEffect(() => {
        if (isToNativeETH) {
            const wethToken = availableTokens.find(t => t.symbol === 'WETH');
            if (wethToken) {
                setToToken(wethToken);
                console.log('检测到输出为原生 ETH, 自动切换为 WETH 地址');
            }
        }
    }, [toToken]);

    // 获取出售代币余额
    const { data: fromTokenBalance, isFetching: isFetchingFromBalance } = useBalance({
        address,
        token: fromToken?.address && fromToken.address !== '0x0000000000000000000000000000000000000000' ? fromToken.address as `0x${string}` : undefined,
        query: { enabled: Boolean(address && fromToken?.address) },
    });

    // 获取购买代币余额
    const { data: toTokenBalance, isFetching: isFetchingToBalance } = useBalance({
        address,
        token: toToken?.address && toToken.address !== '0x0000000000000000000000000000000000000000' ? toToken.address as `0x${string}` : undefined,
        query: { enabled: Boolean(address && toToken?.address) },
    });

    useEffect(() => {
        const fetchAllowance = async () => {
            if (address && fromToken) {
                const isNativeETH = fromToken.address === '0x0000000000000000000000000000000000000000';
                if (isNativeETH) {
                    // ETH 无需授权
                    setApproveStatus('done');
                    return;
                }
                try {
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
                }
            }
        };
        fetchAllowance();
    }, [address, fromToken, checkAllowance]);

    const handleApprove = async () => {
        if (!fromToken || !address || !walletClient) {
            setErrorMessage('未选择代币或未连接钱包');
            return;
        }

        const isNativeETH = fromToken.address === '0x0000000000000000000000000000000000000000';
        if (isNativeETH) {
            alert('ETH 无需授权');
            setApproveStatus('done');
            return;
        }

        try {
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
        }
    };

    const handleSwap = async () => {
        console.log('是否原生 ETH 输入:', isFromNativeETH);
        console.log('是否原生 ETH 输出:', isToNativeETH);

        if (!isConnected) {
            alert('请先连接钱包');
            return;
        }
        if (!fromToken || !toToken || !address || !publicClient || !walletClient) {
            alert('未选择代币或未连接钱包');
            return;
        }

        const isNativeETH = fromToken.address === '0x0000000000000000000000000000000000000000';

        if (!isNativeETH) {
            try {
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
            }
        }

        try {
            const commands = '0x'; // 这里应该生成 swap 所需的指令数据
            const inputs: `0x${string}`[] = []; // 这里应该生成 swap 所需的输入数据

            setApproveStatus('pending');
            const receipt = await executeSwap({
                commands,
                inputs,
                isFromNativeETH,
                isToNativeETH,
            });

            console.log('Swap 成功:', receipt);
            alert('交易完成');
            setApproveStatus('done');
        } catch (err: any) {
            console.error('Swap 失败:', err);
            setErrorMessage(err.message || 'Swap 失败');
            setApproveStatus('idle');
        }
    };

    return (
        <main className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            {/* Wallet connect button top-right */}
            <div className="absolute top-4 right-4">
                <ConnectButton />
            </div>

            <h1 className="text-2xl font-bold mb-4">交易</h1>

            <div className="w-full max-w-md bg-white rounded-lg shadow p-6 space-y-4">
                {/* Sell Token */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">出售代币</label>
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            value={fromAmount}
                            onChange={(e) => {
                                setInputSource('from'); // 记录“用户改了 from”
                                setAmount(e.target.value);
                                setFromAmount(e.target.value);
                            }}
                            placeholder="输入数量"
                            className="flex-1 border rounded p-2"
                        />
                        <select
                            value={fromToken?.symbol || ''}
                            onChange={(e) => {
                                const selected: Token | undefined = availableTokens.find(t => t.symbol === e.target.value);
                                if (selected) setFromToken(selected);
                            }}
                            className="border rounded p-2"
                        >
                            {availableTokens.map(token => (
                                <option key={token.address} value={token.symbol}>{token.symbol}</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                        余额: {isFetchingFromBalance ? '加载中...' : fromTokenBalance ? `${Math.floor(parseFloat(formatUnits(fromTokenBalance.value, fromToken?.decimals || 18)) * 1e6) / 1e6}` : '--'}
                    </div>
                </div>

                {/* Buy Token */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">购买代币</label>
                    <div className="flex space-x-2">
                        <input
                            type="number"
                            value={toAmount}
                            onChange={(e) => {
                                setInputSource('to'); // 记录“用户改了 to”
                                setAmount(e.target.value);
                                setToAmount(e.target.value);
                            }}
                            placeholder="得到数量"
                            className="flex-1 border rounded p-2"
                        />
                        <select
                            value={toToken?.symbol || ''}
                            onChange={(e) => {
                                const selected: Token | undefined = availableTokens.find(t => t.symbol === e.target.value);
                                if (selected) setToToken(selected);
                            }}
                            className="border rounded p-2"
                        >
                            {availableTokens
                                .filter(token => token.address !== fromToken?.address)
                                .map(token => (
                                    <option key={token.address} value={token.symbol}>{token.symbol}</option>
                                ))}
                        </select>
                    </div>
                    <div className="text-xs text-gray-500 text-right">
                        余额: {isFetchingToBalance ? '加载中...' : toTokenBalance ? `${Math.floor(parseFloat(formatUnits(toTokenBalance.value, toToken?.decimals || 18)) * 1e6) / 1e6}` : '--'}
                    </div>
                </div>

                {allowance !== null && (
                    <div className="text-xs text-gray-500 text-right">
                        授权额度: {Number(allowance.amount) / 10 ** (fromToken?.decimals || 18)}
                    </div>
                )}

                <Button
                    onClick={handleApprove}
                    disabled={approveStatus === 'pending' || !isConnected}
                    className="w-full bg-yellow-500 hover:bg-yellow-600"
                >
                    {approveStatus === 'pending' ? '授权中...' : '授权 Permit2'}
                </Button>

                {/* Info Rows */}
                <div className="space-y-2 text-sm text-gray-600">
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

                {/* Swap Button */}
                <Button
                    onClick={handleSwap}
                    className="w-full"
                    disabled={priceLoading || approveStatus === 'pending'}
                >
                    {priceLoading ? '获取价格中...'
                        : isConnected ? (approveStatus === 'pending' ? '交易中...' : '交换') : '连接钱包'}

                </Button>

                {errorMessage && (
                    <div className="text-red-500 text-sm mt-2">{errorMessage}</div>
                )}
            </div>
        </main>
    );
}