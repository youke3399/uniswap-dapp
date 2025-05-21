import { create } from 'zustand';
import { Token, TradeType } from '@uniswap/sdk-core';
import type { NativeCurrency } from '@uniswap/sdk-core';
import { ChainTokens, swapTokens } from '@/tokens';

interface SwapState {
  chainId: number;
  availableTokens: (Token | NativeCurrency)[];
  fromToken: Token | NativeCurrency | null;
  toToken: Token | NativeCurrency | null;
  fromAmount: string;
  toAmount: string;
  amount: string;
  tradeType: TradeType;
  approveStatus: 'idle' | 'pending' | 'done';
  swapStatus: 'idle' | 'pending' | 'done';
  swapError: string | null;

  setChainId: (chainId: number) => void;
  setFromToken: (token: Token | NativeCurrency) => void;
  setToToken: (token: Token | NativeCurrency) => void;
  setFromAmount: (fromAmount: string) => void;
  setToAmount: (toAmount: string) => void;
  setAmount: (amount: string) => void;
  setTradeType: (tradeType: TradeType) => void;
  setApproveStatus: (status: 'idle' | 'pending' | 'done') => void;
  setSwapStatus: (status: 'idle' | 'pending' | 'done') => void;
  setSwapError: (msg: string | null) => void;
}

export const useSwapStore = create<SwapState>((set) => {
  const defaultChainId = 1;
  const tokenList: ChainTokens = swapTokens[defaultChainId] ?? {};

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
    tradeType: TradeType.EXACT_INPUT,
    approveStatus: 'idle',
    swapStatus: 'idle',
    swapError: null,

    setChainId: (chainId) => {
      const tokenList = swapTokens[chainId] ?? {};
      set(() => ({
        chainId,
        availableTokens: Object.values(tokenList),
        fromToken: Object.values(tokenList)[0] ?? null,
        toToken: Object.values(tokenList)[1] ?? null,
      }));
    },

    setFromToken: (token) => {
      set((state) => {
        const updatedToToken =
          token instanceof Token &&
            state.toToken instanceof Token &&
            token.address === state.toToken.address
            ? state.availableTokens.find(
              (t) =>
                t instanceof Token &&
                token instanceof Token &&
                t.address !== token.address
            ) ?? null
            : state.toToken;

        return {
          fromToken: token,
          toToken: updatedToToken,
        };
      });
    },
    setToToken: (token) => {
      set((state) => {
        const updatedFromToken =
          token instanceof Token &&
            state.fromToken instanceof Token &&
            token.address === state.fromToken.address
            ? state.availableTokens.find(
              (t) =>
                t instanceof Token &&
                token instanceof Token &&
                t.address !== token.address
            ) ?? null
            : state.fromToken;

        return {
          toToken: token,
          fromToken: updatedFromToken,
        };
      });
    },
    setFromAmount: (fromAmount) => {
      set({ fromAmount });
    },
    setToAmount: (toAmount) => set({ toAmount }),
    setAmount: (amount) => set({ amount }),
    setTradeType: (tradeType) => set({ tradeType }),
    setApproveStatus: (status) => set({ approveStatus: status }),
    setSwapStatus: (status) => set({ swapStatus: status }),
    setSwapError: (msg) => set({ swapError: msg }),
  };
});