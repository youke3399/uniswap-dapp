
import { parseAbi } from 'viem';
import { ChainAddresses } from '@/types';


export const quoterAddresses: ChainAddresses = {
    1: '0x5e55C9e631FAE526cd4B0526C4818D6e0a9eF0e3',
    11155111: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',

};

export const quoterAbi = parseAbi([
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountReceived, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
    'function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96)) view returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
]);

// 小工具函数
export function getQuoterAddress(chainId: number): `0x${string}` {
    return quoterAddresses[chainId] ?? quoterAddresses[1]; // 默认主网
}