
import { parseAbi } from 'viem';
import { ChainAddresses } from '@/types';


export const universalRouterAddresses: ChainAddresses = {
    1: '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af',
    11155111: '0x3a9d48ab9751398bbfa63ad67599bb04e4bdf98b',

};

export const universalRouterAbi = parseAbi([
    'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
    'function poolManager() view returns (address)',
    'function V3_POSITION_MANAGER() view returns (address)',
    'function V4_POSITION_MANAGER() view returns (address)',
    'function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes data)',
]);

// 小工具函数
export function getUniversalRouterAddress(chainId: number): `0x${string}` {
    return universalRouterAddresses[chainId] ?? universalRouterAddresses[1]; // 默认主网
}