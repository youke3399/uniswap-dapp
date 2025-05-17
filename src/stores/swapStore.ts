import { create } from 'zustand';
import { Token } from '@uniswap/sdk-core';
import type { NativeCurrency } from '@uniswap/sdk-core';
import { SwapDirection } from '@/types';
import type { ChainTokens } from '@/types';
import { swapTokens } from '@/tokens';

interface SwapState {
  chainId: number;
  availableTokens: (Token | NativeCurrency)[];
  fromToken: Token | NativeCurrency | null;
  fromBalance: bigint;
  toToken: Token | NativeCurrency | null;
  toBalance: bigint;
  fromAmount: string;
  toAmount: string;
  amount: string;
  inputSource: SwapDirection;
  approveStatus: 'idle' | 'pending' | 'done';
  swapStatus: 'idle' | 'pending' | 'done';
  errorMessage: string | null;

  setChainId: (chainId: number) => void;
  setFromToken: (token: Token | NativeCurrency) => void;
  setToToken: (token: Token | NativeCurrency) => void;
  setFromAmount: (fromAmount: string) => void;
  setToAmount: (toAmount: string) => void;
  setAmount: (amount: string) => void;
  setInputSource: (inputSource: SwapDirection) => void;
  setFromBalance: (balance: bigint) => void;
  setToBalance: (balance: bigint) => void;
  setApproveStatus: (status: 'idle' | 'pending' | 'done') => void;
  setSwapStatus: (status: 'idle' | 'pending' | 'done') => void;
  setErrorMessage: (message: string | null) => void;
}

export const useSwapStore = create<SwapState>((set) => {
  const defaultChainId = 1;
  const tokenList: ChainTokens = swapTokens[defaultChainId];

  return {
    chainId: defaultChainId,
    availableTokens: Object.values(tokenList),
    fromToken: Object.values(tokenList)[0] ?? null,
    fromBalance: BigInt(0),
    toToken: Object.values(tokenList)[1] ?? null,
    toBalance: BigInt(0),
    fromAmount: '',
    toAmount: '',
    amount: '',
    inputSource: 'from',
    approveStatus: 'idle',
    swapStatus: 'idle',
    errorMessage: null,

    setChainId: (chainId) => {
      const tokenList = swapTokens[chainId] as ChainTokens;
      set(() => ({
        chainId,
        availableTokens: Object.values(tokenList),
        fromToken: Object.values(tokenList)[0] ?? null,
        toToken: Object.values(tokenList)[1] ?? null,
      }));
    },

    setFromToken: (token) =>
      set((state) => {
        const isSame =
          token instanceof Token &&
          state.toToken instanceof Token &&
          token.address === state.toToken.address;

        return {
          ...state,
          fromToken: token,
          toToken: isSame ? null : state.toToken,
        };
      }),
    setToToken: (token) =>
      set((state) => {
        const isSame =
          token instanceof Token &&
          state.fromToken instanceof Token &&
          token.address === state.fromToken.address;

        return {
          ...state,
          toToken: token,
          fromToken: isSame ? null : state.fromToken,
        };
      }),
    setFromAmount: (fromAmount) => set((state) => ({ ...state, fromAmount })),
    setToAmount: (toAmount) => set((state) => ({ ...state, toAmount })),
    setAmount: (amount) => set((state) => ({ ...state, amount })),
    setInputSource: (inputSource: SwapDirection) => set((state) => ({ ...state, inputSource })),
    setToBalance: (toBalance) => set((state) => ({ ...state, toBalance })),
    setFromBalance: (fromBalance) => set((state) => ({ ...state, fromBalance })),
    setApproveStatus: (status) => set((state) => ({ ...state, approveStatus: status })),
    setSwapStatus: (status) => set((state) => ({ ...state, swapStatus: status })),
    setErrorMessage: (message) => set((state) => ({ ...state, errorMessage: message })),
  };
});