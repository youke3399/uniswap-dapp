import { Token, Ether, NativeCurrency } from '@uniswap/sdk-core';

export type ChainTokens = {
    [symbol: string]: Token | NativeCurrency;
};

export type TokensMap = {
    [chainId: number]: ChainTokens;
};

// 多链 token 配置，结构为 chainId -> tokens
export const swapTokens: TokensMap = {
    1: {
        ETH: Ether.onChain(1),
        /* WETH: new Token(
            1,
            '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            18,
            'WETH',
            'Wrapped Ether'
        ), */
        RPL: new Token(
            1,
            '0xD33526068D116cE69F19A9ee46F0bd304F21A51f',
            18,
            'RPL',
            'Rocket Pool'
        ),
        USDT: new Token(
            1,
            '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            6,
            'USDT',
            'Tether USD'
        ),
        USDC: new Token(
            1,
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            6,
            'USDC',
            'USD Coin'
        ),
        PEPE: new Token(
            1,
            '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
            18,
            'PEPE',
            'pepe'
        ),
    },
};
