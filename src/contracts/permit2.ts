
import { parseAbi } from 'viem';
import { ChainAddresses } from '@/types';


export const permit2Addresses: ChainAddresses = {
    1: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    11155111: '0x000000000022D473030F116dDEE9F6B43aC78BA3',

};

export const permit2Abi = parseAbi([
    'function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)',
    'function approve(address token, address spender, uint160 amount, uint48 expiration)',
]);

// 小工具函数
export function getPermit2Address(chainId: number): `0x${string}` {
    return permit2Addresses[chainId] ?? permit2Addresses[1]; // 默认主网
}