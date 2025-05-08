import { useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { Token } from '@uniswap/sdk-core';
import { readContract, writeContract } from 'viem/actions';
import { getPermit2Address, getUniversalRouterAddress, permit2Abi } from '@/contracts';

export function usePermit2() {
    const chainId = useChainId();
    const permit2Address = getPermit2Address(chainId);
    const universalRouterAddress = getUniversalRouterAddress(chainId);
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    async function checkAllowance(owner: `0x${string}`, token: Token & { address: `0x${string}` }) {
        if (!publicClient) throw new Error('No public client available');
        if (!walletClient) throw new Error('No wallet client available');

        const [amount, expiration, nonce] = await readContract(publicClient, {
            address: permit2Address,
            abi: permit2Abi,
            functionName: 'allowance',
            args: [owner, token.address, universalRouterAddress],
        }) as readonly [bigint, number, number];

        return {
            amount,
            expiration,
            nonce,
        };
    }

    async function getPermitSignature({
        token,
        owner,
        nonce,
    }: {
        token: Token & { address: `0x${string}` };
        owner: `0x${string}`;
        nonce: number;
    }): Promise<{
        signature: string;
        permit: {
            token: `0x${string}`;
            amount: bigint;
            expiration: number;
            nonce: number;
            owner: `0x${string}`;
            spender: `0x${string}`;
        };
    }> {
        if (!walletClient) throw new Error('No wallet client available');
        if (!chainId) throw new Error('No chainId available');

        const domain = {
            name: 'Permit2',
            chainId,
            verifyingContract: permit2Address,
        };

        const message = {
            token: token.address,
            amount: BigInt(10000) * BigInt(10) ** BigInt(token.decimals), // 直接授权10000个
            expiration: Math.floor(Date.now() / 1000) + 3600 * 24 * 365, // 1 year expiry
            nonce: Number(nonce),
        };

        const account = walletClient.account;
        const signTypedData = walletClient.signTypedData!;

        const signature = await signTypedData({
            account,
            domain,
            types: {
                Permit: [
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint160' },
                    { name: 'expiration', type: 'uint48' },
                    { name: 'nonce', type: 'uint48' },
                ],
            },
            primaryType: 'Permit',
            message,
        });

        return {
            signature,
            permit: {
                ...message,
                owner,
                spender: universalRouterAddress,
            },
        };
    }

    async function approvePermit({
        token,
        amount,
        expiration,
        account,
    }: {
        token: Token & { address: `0x${string}` };
        amount: bigint;
        expiration: number;
        account: `0x${string}`;
    }) {
        if (!walletClient) throw new Error('No wallet client available');
        if (!chainId) throw new Error('No chainId available');

        const txHash = await writeContract(walletClient, {
            account,
            address: permit2Address,
            abi: permit2Abi,
            functionName: 'approve',
            args: [token.address, universalRouterAddress, amount, Number(expiration)],
        });

        return txHash;
    }

    return {
        checkAllowance,
        getPermitSignature,
        approvePermit,
    };
}