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

  setChainId: (chainId: number) => void;
  setFromToken: (token: Token | NativeCurrency) => void;
  setToToken: (token: Token | NativeCurrency) => void;
  setFromAmount: (fromAmount: string) => void;
  setToAmount: (toAmount: string) => void;
  setAmount: (amount: string) => void;
  setTradeType: (tradeType: TradeType) => void;
  setApproveStatus: (status: 'idle' | 'pending' | 'done') => void;
  setSwapStatus: (status: 'idle' | 'pending' | 'done') => void;
}

export const useSwapStore = create<SwapState>((set, get) => {
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
        const isSame =
          token instanceof Token &&
          state.toToken instanceof Token &&
          token.address === state.toToken.address;
        return {
          fromToken: token,
          toToken: isSame ? null : state.toToken,
        };
      });
    },
    setToToken: (token) => {
      set((state) => {
        const isSame =
          token instanceof Token &&
          state.fromToken instanceof Token &&
          token.address === state.fromToken.address;
        return {
          toToken: token,
          fromToken: isSame ? null : state.fromToken,
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
  };
});