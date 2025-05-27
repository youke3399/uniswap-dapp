'use client';
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, usePublicClient } from "wagmi";
import { useSwapStore } from "@/stores/swapStore";
import { usePermit2 } from "@/hooks/usePermit2";
import { useSwapPrice } from "@/hooks/useSwapPrice";
import { Token, TradeType } from "@uniswap/sdk-core";
import { formatBalance } from "@/libs/conversion";
import { formatUnits, parseUnits } from "viem";

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
        console.error("获取 Gas 失败:", error);
      }
    };

    fetchGas(); // 初始获取一次

    const interval = setInterval(fetchGas, 30000); // 每 30 秒轮询一次

    return () => clearInterval(interval); // 组件卸载时清除定时器
  }, [publicClient]);

  const state = useSwapStore();
  const {
    fromToken,
    toToken,
    fromAmount,
    toAmount,
    tradeType,
    availableTokens,
    setFromToken,
    setToToken,
    setFromAmount,
    setToAmount,
    setTradeType,

    approveStatus,
    swapStatus,
    setApproveStatus,
    setSwapStatus,

    swapError,
    setSwapError,
  } = state;

  // Permit2 hooks
  const { approveTokenForPermit2 } = usePermit2();

  // 使用 useDebounce 替代手动防抖逻辑
  const [debouncedAmount] = useDebounce(
    tradeType === TradeType.EXACT_INPUT ? fromAmount : toAmount,
    800
  );

  // 计算价格，传入 debouncedAmount
  const {
    price,
    route,
    gasPrice,
    priceImpact,
    loading: priceLoading,
    error: priceError,
    executeSwap,
  } = useSwapPrice({
    tokenIn: fromToken,
    tokenOut: toToken,
    amount: debouncedAmount,
    tradeType,
    recipient: address || "",
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
  const { data: fromTokenBalance, isFetching: isFetchingFromBalance } =
    useBalance({
      address,
      token:
        fromToken && "address" in fromToken
          ? (fromToken.address as `0x${string}`)
          : undefined,
      query: {
        refetchInterval: 30000,
        refetchOnWindowFocus: true,
      },
    });

  // 获取购买代币余额
  const { data: toTokenBalance, isFetching: isFetchingToBalance } = useBalance({
    address,
    token:
      toToken && "address" in toToken
        ? (toToken.address as `0x${string}`)
        : undefined,
    query: {
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
    },
  });

  // Swap 辅助函数
  function resetAfterSuccess() {
    setFromAmount("");
    setToAmount("");
    setApproveStatus("idle");
    setSwapStatus("idle");
    setSwapError(null);
  }

  async function handleNativeSwap() {
    setSwapStatus("pending");
    try {
      await executeSwap();
      setSwapStatus("idle");
    } catch (err) {
      console.error("ETH Swap Error", err);
      setSwapError("ETH 交换失败，请重试");
      setSwapStatus("idle");
    }
  }

  async function handleTokenSwap(
    token: Token & { address: `0x${string}` },
    amountRaw: bigint
  ) {
    // 非 ETH 情况：先审查（approve）或交换
    if (approveStatus === "idle") {
      setApproveStatus("pending");
      try {
        await approveTokenForPermit2({
          token,
          account: address as `0x${string}`,
          amount: amountRaw,
        });
        setApproveStatus("done");
      } catch (err) {
        console.error("Approve Error", err);
        setSwapError("授权失败，请重试");
        setApproveStatus("idle");
      }
      return;
    }
    // 审查完成后：执行 permit 签名和交易
    if (approveStatus === "done") {
      setSwapStatus("pending");
      try {
        await executeSwap();
        resetAfterSuccess();
      } catch (err) {
        console.error("交易失败", err);
        setSwapError("交易失败，请重试");
        setApproveStatus("idle");
        setSwapStatus("idle");
      }
    }
  }

  async function handleSwapClick() {
    setSwapError(null);
    if (!isConnected || !fromToken || !address) return;
    const isNative = "isNative" in fromToken && fromToken.isNative;
    const amountRaw = parseUnits(fromAmount || "0", fromToken?.decimals ?? 18);
    const token = !isNative
      ? (fromToken as Token & { address: `0x${string}` })
      : null;

    if (isNative) {
      if (approveStatus !== "done") {
        setApproveStatus("done");
        return;
      }
      await handleNativeSwap();
      return;
    }
    if (token) {
      await handleTokenSwap(token, amountRaw);
    }
  }

  const isSwapButtonDisabled =
    priceLoading ||
    approveStatus === "pending" ||
    swapStatus === "pending" ||
    !fromToken ||
    !toToken ||
    (fromToken && toToken && fromToken.symbol === toToken.symbol) ||
    !fromAmount ||
    Number(fromAmount) <= 0;

  let swapButtonText = "";
  if (priceLoading) {
    swapButtonText = "获取价格中...";
  } else if (!isConnected) {
    swapButtonText = "连接钱包";
  } else if (!fromToken || !toToken) {
    swapButtonText = fromToken && toToken ? "加载中..." : "请选择代币";
  } else if (!fromAmount || Number(fromAmount) <= 0) {
    swapButtonText = "请输入数量";
  } else if (approveStatus === "pending") {
    swapButtonText = "授权中...";
  } else if (approveStatus === "done" && swapStatus === "idle") {
    swapButtonText = "交换";
  } else if (approveStatus === "idle") {
    swapButtonText = "批准";
  } else if (swapStatus === "pending") {
    swapButtonText = "交换中...";
  } else {
    swapButtonText = "交换";
  }

  return (
    <main className="relative flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      {/* Wallet connect button top-right */}
      <div className="absolute top-4 right-4">
        <ConnectButton />
      </div>

      <h1 className="text-2xl font-bold mb-6 text-gray-800 w-full text-center">交易</h1>

      <div className="w-full sm:w-[480px] bg-white rounded-lg shadow-lg p-6 space-y-6">
        <div className="flex flex-col gap-y-3 text-gray-800">
          {/* Sell Token */}
          <div>
            <label className="block text-sm font-medium text-gray-500">
              出售代币
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg p-2 space-x-2 bg-white">
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => {
                  if (priceLoading) return;
                  const val = e.target.value;
                  setTradeType(TradeType.EXACT_INPUT); // 用户设置出售数量
                  setFromAmount(val);
                }}
                placeholder="输入数量"
                className="flex-1 bg-white rounded-lg outline-none placeholder-gray-600 text-sm text-gray-800 focus:ring-2 focus:ring-yellow-500 p-2"
              />
              <select
                value={fromToken ? fromToken.symbol : ""}
                onChange={(e) => {
                  const selected = availableTokens.find(
                    (t) => t.symbol === e.target.value
                  );
                  if (selected) setFromToken(selected);
                }}
                className="bg-white rounded-lg outline-none text-sm text-gray-800 p-2"
              >
                {availableTokens.map((token) => (
                  <option key={token.symbol} value={token.symbol}>
                    {token.symbol}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              余额:
              {isFetchingFromBalance
                ? "加载中..."
                : formatBalance(
                    formatUnits(
                      fromTokenBalance?.value || 0n,
                      fromToken?.decimals || 18
                    )
                  )}
            </div>
          </div>

          {/* Buy Token */}
          <div>
            <label className="block text-sm font-medium text-gray-500">
              购买代币
            </label>
            <div className="flex items-center border border-gray-300 rounded-lg p-2 space-x-2 bg-white">
              <input
                type="number"
                value={toAmount}
                onChange={(e) => {
                  if (priceLoading) return;
                  const val = e.target.value;
                  setTradeType(TradeType.EXACT_OUTPUT); // 用户设置购买数量
                  setToAmount(val);
                }}
                placeholder="得到数量"
                className="flex-1 bg-white rounded-lg outline-none placeholder-gray-600 text-sm text-gray-800 focus:ring-2 focus:ring-yellow-500 p-2"
              />
              <select
                value={toToken ? toToken.symbol : ""}
                onChange={(e) => {
                  const selected = availableTokens.find(
                    (t) => t.symbol === e.target.value
                  );
                  if (selected) setToToken(selected);
                }}
                className="bg-white rounded-lg outline-none text-sm text-gray-800 p-2"
              >
                {availableTokens
                  .filter((token) => token.symbol !== fromToken?.symbol)
                  .map((token) => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
              </select>
            </div>
            <div className="text-xs text-gray-500 text-right mt-1">
              余额:
              {isFetchingToBalance
                ? "加载中..."
                : formatBalance(
                    formatUnits(
                      toTokenBalance?.value || 0n,
                      toToken?.decimals || 18
                    )
                  )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-y-3">
          {/* Swap Button */}
          <button
            className={`w-full bg-yellow-500 hover:bg-yellow-600 text-white disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg py-2`}
            disabled={isSwapButtonDisabled}
            onClick={handleSwapClick}
          >
            {swapButtonText}
          </button>
        </div>

        {/* Info Rows */}
        <div className="space-y-2 text-sm font-medium text-gray-600 border-t border-gray-300 pt-4">
          <div className="flex justify-between">
            <span>当前Gas:</span>
            <span>
              {currentGasGwei !== null ? `${currentGasGwei} Gwei` : "--"}
            </span>
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
          <div className="text-sm font-medium text-gray-600 border-t border-gray-300 pt-4">
            <div>订单路由：</div>
            <ul className="mt-1 space-y-2">
              {(
                route as unknown as {
                  protocol: string;
                  percent: number;
                  pools: { token0: string; token1: string; fee: number }[];
                }[]
              ).map((r, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  <span>
                    [{r.protocol}] {r.percent}%
                  </span>{" "}
                  {r.pools.map((p, j) => (
                    <span key={j} className="ml-1 text-gray-600">
                      {p.token0} → {p.token1} ({p.fee / 10000}%){" "}
                      {j < r.pools.length - 1 ? "|" : ""}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(priceError || swapError) && (
          <div className="text-red-600 text-sm font-medium text-center mt-4 bg-red-100 rounded-md p-2">
            {priceError || swapError}
          </div>
        )}
      </div>
    </main>
  );
}
