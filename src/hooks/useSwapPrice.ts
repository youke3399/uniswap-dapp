import { useEffect, useState } from "react";
import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { Token, NativeCurrency, TradeType } from "@uniswap/sdk-core";
import {
  UNIVERSAL_ROUTER_ADDRESS,
  UniversalRouterVersion,
} from "@uniswap/universal-router-sdk";

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
  const [price, setPrice] = useState("");
  const [gasPrice, setGasPrice] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteInfo[] | null>(null);
  const [priceImpact, setPriceImpact] = useState("");
  const [calldata, setCalldata] = useState(null);
  const [value, setValue] = useState("");

  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESS(
    UniversalRouterVersion.V2_0,
    chainId
  ) as `0x${string}`;

  useEffect(() => {
    if (!tokenIn || !tokenOut || !amount || Number(amount) <= 0 || !recipient)
      return;

    const fetchPrice = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("http://127.0.0.1:3001/api/quote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokenIn,
            tokenOut,
            amount,
            tradeType,
            recipient,
            protocols:process.env.NEXT_PUBLIC_PROTOCOLS ?? null,
            minSplits:process.env.NEXT_PUBLIC_MINSPLITS ?? null,
            slippage:process.env.NEXT_PUBLIC_SLIPPAGE ?? 50,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "报价失败");

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
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("未知错误");
        }
        setPrice("");
        setRoute(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
  }, [tokenIn, tokenOut, amount, tradeType, recipient]);

  async function executeSwap() {
    if (!walletClient) throw new Error("No wallet client available");
    if (!publicClient) throw new Error("No public client available");
    if (!chainId) throw new Error("No chainId available");
    if (!calldata) throw new Error("No calldata available");

    try {
      const txHash = await walletClient.sendTransaction({
        to: universalRouterAddress,
        data: calldata as `0x${string}`,
        account: walletClient.account.address as `0x${string}`,
        value: value ? BigInt(value) : undefined,
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
      });
      console.log(
        "Swap receipt:",
        JSON.stringify(receipt, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)
      );
    } catch (error) {
      throw new Error(`Failed to swap: ${(error as Error).message}`);
    }
  }

  return {
    price,
    gasPrice,
    loading,
    error,
    route,
    priceImpact,
    calldata,
    value,
    executeSwap,
  };
}
