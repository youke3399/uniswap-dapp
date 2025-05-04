'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';

export default function SwapPage() {
    const { address, isConnected } = useAccount();
    const [fromToken, setFromToken] = useState('ETH');
    const [toToken, setToToken] = useState('USDC');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('0');
    const [price, setPrice] = useState('2000'); // Example price
    const [balance, setBalance] = useState('1.5'); // Example balance
    const [slippage, setSlippage] = useState('0.5');
    const [gasFee, setGasFee] = useState('0.001');

    const handleSwap = () => {
        if (!isConnected) {
            alert('请先连接钱包');
        } else {
            alert(`执行 Swap: ${fromAmount} ${fromToken} -> ${toToken}`);
            // 这里调用实际 swap 函数
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
                            value={fromToken}
                            onChange={(e) => setFromToken(e.target.value)}
                            className="border rounded p-2"
                        >
                            <option value="ETH">ETH</option>
                            <option value="USDC">USDC</option>
                            <option value="DAI">DAI</option>
                        </select>
                    </div>
                    <div className="text-xs text-gray-500">余额: {balance} {fromToken}</div>
                </div>

                {/* Buy Token */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">购买代币</label>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={toAmount}
                            readOnly
                            placeholder="根据价格自动计算"
                            className="flex-1 border rounded p-2 bg-gray-100"
                        />
                        <select
                            value={toToken}
                            onChange={(e) => setToToken(e.target.value)}
                            className="border rounded p-2"
                        >
                            <option value="RPL">RPL</option>
                            <option value="ETH">ETH</option>
                            <option value="USDC">USDC</option>
                            <option value="DAI">DAI</option>
                        </select>
                    </div>
                    <div className="text-xs text-gray-500">当前价格: 1 {fromToken} = {price} {toToken}</div>
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