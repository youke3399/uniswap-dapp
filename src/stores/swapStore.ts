import { create } from 'zustand';
import { Token } from '@uniswap/sdk-core';
import { SwapDirection } from '@/types';


interface SwapState {
  fromToken: (Token & { address: `0x${string}` }) | null;
  // 以 bigint 存储代币余额（用于 wagmi + viem 获取的原始数值）
  fromBalance: bigint;
  toToken: (Token & { address: `0x${string}` }) | null;
  // 以 bigint 存储代币余额（用于 wagmi + viem 获取的原始数值）
  toBalance: bigint;
  fromAmount: string;
  toAmount: string;
  amount: string;
  inputSource: SwapDirection;

  setFromToken: (token: Token) => void;
  setToToken: (token: Token) => void;
  setFromAmount: (fromAmount: string) => void;
  setToAmount: (toAmount: string) => void;
  setAmount: (amount: string) => void;
  setInputSource: (inputSource: SwapDirection) => void;
  setFromBalance: (balance: bigint) => void;
  setToBalance: (balance: bigint) => void;

}

// 交易usdt usdc dai等稳定币，交易weth直接用uniswap官网界面，无需界面使用费0.25%
export const availableTokens: (Token & { address: `0x${string}` })[] = [
  new Token(1, '0x0000000000000000000000000000000000000000', 18, 'ETH', 'Ether') as Token & { address: `0x${string}` },
  // new Token(1, '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', 18, 'WETH', 'Wrapped Ether') as Token & { address: `0x${string}` },
  new Token(1, '0xD33526068D116cE69F19A9ee46F0bd304F21A51f', 18, 'RPL', 'Rocket Pool Protocol') as Token & { address: `0x${string}` },
  new Token(1, '0xdAC17F958D2ee523a2206206994597C13D831ec7', 6, 'USDT', 'Tether') as Token & { address: `0x${string}` },
  new Token(1, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', 6, 'USDC', 'USD Coin') as Token & { address: `0x${string}` },
  // new Token(1, '0x6B175474E89094C44Da98b954EedeAC495271d0F', 18, 'DAI', 'Dai Stablecoin') as Token & { address: `0x${string}` },
];

export const useSwapStore = create<SwapState>((set) => ({
  fromToken: availableTokens[0],
  fromBalance: BigInt(0),
  toToken: availableTokens[1],
  toBalance: BigInt(0),
  fromAmount: '',
  toAmount: '',
  amount:'',
  inputSource: 'from',

  setFromToken: (token) =>
    set((state) => ({
      ...state,
      fromToken: token as Token & { address: `0x${string}` },
      toToken: state.toToken?.address === (token as Token & { address: `0x${string}` }).address ? null : state.toToken,
    })),
  setToToken: (token) =>
    set((state) => ({
      ...state,
      toToken: token as Token & { address: `0x${string}` },
      fromToken: state.fromToken?.address === (token as Token & { address: `0x${string}` }).address ? null : state.fromToken,
    })),
  setFromAmount: (fromAmount) => set((state) => ({ ...state, fromAmount })),
  setToAmount: (toAmount) => set((state) => ({ ...state, toAmount })),
  setAmount: (amount) => set((state) => ({ ...state, amount })),
  setInputSource: (inputSource: SwapDirection) => set((state) => ({ ...state, inputSource })),
  setToBalance: (toBalance) => set((state) => ({ ...state, toBalance })),
  setFromBalance: (fromBalance) => set((state) => ({ ...state, fromBalance })),

}));