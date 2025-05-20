import { useWalletClient, usePublicClient, useChainId } from 'wagmi';
import { encodeFunctionData, encodeAbiParameters } from 'viem';
import { universalRouterAbi, getUniversalRouterAddress } from '@/contracts';

export function useUniversalRouter() {
    const chainId = useChainId();
    const universalRouterAddress = getUniversalRouterAddress(chainId);
    const { data: walletClient } = useWalletClient();
    const publicClient = usePublicClient();

    async function executeSwap({
        commands,
        inputs,
        isFromNativeETH,
        isToNativeETH,
    }: {
        commands: `0x${string}`;
        inputs: `0x${string}`[];
        isFromNativeETH: boolean;
        isToNativeETH: boolean;
    }) {
        if (!walletClient) throw new Error('No wallet client available');
        if (!publicClient) throw new Error('No public client available');
        if (!chainId) throw new Error('No chainId available');

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 60 * 30);

        let finalCommands = commands;
        const finalInputs = [...inputs];

        if (isToNativeETH) {
            // 添加解包 WETH 的指令（0x08）到 commands 末尾
            finalCommands += '0c';

            // 构造 unwrap 参数
            const unwrapInput = encodeAbiParameters(
                [
                    { type: 'address', name: 'recipient' },
                    { type: 'uint256', name: 'minimumAmount' },
                    { type: 'uint256', name: 'deadline' },
                ],
                [walletClient.account.address as `0x${string}`, 0n, deadline]
            );

            finalInputs.push(unwrapInput);
        }

        const args: [`0x${string}`, `0x${string}`[], bigint] = [finalCommands as `0x${string}`, finalInputs, deadline];

        const data = encodeFunctionData({
            abi: universalRouterAbi,
            functionName: 'execute',
            args,
        });

        const txHash = await walletClient.sendTransaction({
            to: universalRouterAddress,
            data,
            account: walletClient.account.address as `0x${string}`,
            value: isFromNativeETH ? BigInt(inputs[0]) : undefined, // 假设第一个 input 是金额
        });

        const receipt = await publicClient.waitForTransactionReceipt({
            hash: txHash,
        });

        return receipt;
    }

    return {
        executeSwap,
    };
}