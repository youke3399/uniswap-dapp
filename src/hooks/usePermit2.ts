import { useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { providers } from 'ethers';
import { Token } from '@uniswap/sdk-core';
import { readContract, writeContract } from 'viem/actions';
import { UNIVERSAL_ROUTER_ADDRESS,UniversalRouterVersion} from '@uniswap/universal-router-sdk';
import { erc20Abi } from 'viem';
import { SignatureTransfer, AllowanceProvider,PERMIT2_ADDRESS } from '@uniswap/permit2-sdk';
import { permit2Abi } from '@/libs/conversion';

export function usePermit2() {
    const chainId = useChainId();
    const permit2Address = PERMIT2_ADDRESS;
    const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESS(UniversalRouterVersion.V2_0, chainId) as `0x${string}`;
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    // Required for SignatureTransfer: make sure Permit2 contract is approved to spend the token
    async function approveTokenForPermit2({
        token,
        account,
        amount,
    }: {
        token: Token & { address: `0x${string}` };
        account: `0x${string}`;
        amount: bigint;
    }) {
        if (!walletClient) throw new Error('No wallet client available');
        if (!publicClient) throw new Error('No public client available');

        // Check if Permit2 has enough allowance to transfer tokens on behalf of user
        const allowance = await readContract(publicClient, {
            address: token.address,
            abi: erc20Abi,
            functionName: 'allowance',
            args: [account, permit2Address],
        });

        console.log('allowance:', allowance.toString());

        const MAX_UINT256 = BigInt(2) ** BigInt(256) - BigInt(1);
        const MAX_UINT160 = (2n ** 160n) - 1n;

        if (allowance < amount) {
            await writeContract(walletClient, {
                account,
                address: token.address,
                abi: erc20Abi,
                functionName: 'approve',
                args: [permit2Address, MAX_UINT256],
            });

            await writeContract(walletClient, {
                account,
                address: permit2Address,
                abi: permit2Abi,
                functionName: 'approve',
                args: [
                    token.address,
                    universalRouterAddress,
                    MAX_UINT160,
                    Math.floor(Date.now() / 1000) + 3600 * 24 * 365 // 1年
                ],
            });
        }
    }

    async function getSignatureTransferPermit({
        token,
        owner,
        amount,
    }: {
        token: Token & { address: `0x${string}` };
        owner: `0x${string}`;
        amount: bigint;
    }): Promise<{
        signature: string;
        permit: {
            permitted: {
                token: `0x${string}`;
                amount: bigint;
            };
            spender: `0x${string}`;
            nonce: number;
            deadline: number;
        };
    }> {
        if (!walletClient || !chainId || !publicClient) throw new Error('Missing client');

        const ethersProvider = new providers.JsonRpcProvider(publicClient?.transport?.url);

        const allowanceProvider = new AllowanceProvider(ethersProvider, permit2Address);
        const nonce = await allowanceProvider.getNonce(token.address, owner, universalRouterAddress);

        console.log('nonce:', nonce.toString());

        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const permit = {
            permitted: {
                token: token.address,
                amount,
            },
            spender: universalRouterAddress as `0x${string}`,
            nonce,
            deadline,
        };

        const { domain, types, values } = SignatureTransfer.getPermitData(
            permit,
            permit2Address,
            chainId
        );

        const signature = await walletClient.signTypedData({
            account: walletClient.account,
            domain: {
                chainId: Number(domain.chainId),
                name: domain.name,
                verifyingContract: domain.verifyingContract as `0x${string}`,
                version: domain.version,
            },
            types,
            primaryType: 'PermitTransferFrom',
            message: values as unknown as Record<string, unknown>,
        });

        console.log(`[${new Date().toISOString()}] signature:`, signature);

        return {
            signature,
            permit:permit,
        };
    }

    return {
        approveTokenForPermit2,
        getSignatureTransferPermit,
    };
}