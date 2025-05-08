
import { parseAbi } from 'viem';
import { ChainAddresses } from '@/types';


export const v4QuoterAddresses: ChainAddresses = {
    1: '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',
    11155111: '0x61b3f2011a92d183c7dbadbda940a7555ccf9227',

};

/* export const v4QuoterAbi = parseAbi([
    '',
]); */

// 小工具函数
export function getV4QuoterAddress(chainId: number): `0x${string}` {
    return v4QuoterAddresses[chainId] ?? v4QuoterAddresses[1]; // 默认主网
}