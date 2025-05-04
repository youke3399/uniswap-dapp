'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { availableTokens, useSwapStore } from '@/store/swapStore';
import { Token } from '@uniswap/sdk-core';
import { formatUnits } from 'viem';

export default function SwapPage() {
    const { address, isConnected } = useAccount();
    const state = useSwapStore();
    const { fromToken, toToken, slippage, gasFee, fromAmount, toAmount } = state;
    const { setFromToken, setToToken, setFromAmount, setToAmount } = state;

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

    const handleSwap = () => {
        if (!isConnected) {
            alert('请先连接钱包');
        } else {
            alert(`执行 Swap: ${fromAmount} ${fromToken?.symbol}(${fromToken?.address}) -> ${toToken?.symbol}(${toToken?.address})`);
            // 这里调用 swap 时传 token.address
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
                            onChange={(e) => setFromAmount(e.target.value)}
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
                            onChange={(e) => setToAmount(e.target.value)}
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

                {/* Info Rows */}
                <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                        <span>Gas 费用:</span>
                        <span>{gasFee} ETH</span>
                    </div>
                    <div className="flex justify-between">
                        <span>订单路由:</span>
                        <span>Uniswap Router</span>
                    </div>
                    <div className="flex justify-between">
                        <span>价格影响:</span>
                        <span>0.3%</span>
                    </div>
                    <div className="flex justify-between">
                        <span>滑点容忍度:</span>
                        <span>{slippage}%</span>
                    </div>
                </div>

                {/* Swap Button */}
                <Button
                    onClick={handleSwap}
                    className="w-full"
                >
                    {isConnected ? '交换' : '连接钱包'}
                </Button>
            </div>
        </main>
    );
}