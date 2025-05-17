import type { Token, NativeCurrency } from '@uniswap/sdk-core';

export type SwapDirection = 'from' | 'to';
export type ChainAddresses = Record<number, `0x${string}`>;



export type ChainTokens = {
  [symbol: string]: Token | NativeCurrency;
};

export type TokensMap = {
  [chainId: number]: ChainTokens;
};

