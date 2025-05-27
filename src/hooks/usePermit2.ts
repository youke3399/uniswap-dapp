import { useWalletClient, usePublicClient, useChainId } from "wagmi";
import { providers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { readContract, writeContract } from "viem/actions";
import {
  UNIVERSAL_ROUTER_ADDRESS,
  UniversalRouterVersion,
} from "@uniswap/universal-router-sdk";
import { erc20Abi } from "viem";
import { AllowanceProvider, PERMIT2_ADDRESS } from "@uniswap/permit2-sdk";

// Simplified Permit2 ABI: only approve function
const permit2Abi = [
  {
    inputs: [
      { internalType: "address", name: "token", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint160", name: "amount", type: "uint160" },
      { internalType: "uint48", name: "expiration", type: "uint48" },
    ],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function usePermit2() {
  const chainId = useChainId();
  const permit2Address = PERMIT2_ADDRESS;
  const universalRouterAddress = UNIVERSAL_ROUTER_ADDRESS(
    UniversalRouterVersion.V2_0,
    chainId
  ) as `0x${string}`;
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Constants for maximum values and expiration
  const MAX_UINT256 = BigInt(2) ** BigInt(256) - BigInt(1);
  const MAX_UINT160 = 2n ** 160n - 1n;
  const ONE_YEAR_IN_SECONDS = 3600 * 24 * 365;
  const currentTimestampInSeconds = Math.floor(Date.now() / 1000);
  const permit2ExpirationTimestamp = currentTimestampInSeconds + ONE_YEAR_IN_SECONDS;

  /**
   * Approves a token for use with Permit2 and Universal Router.
   * Handles ERC20 approval to Permit2 contract and Permit2 approval to Universal Router.
   */
  async function approveTokenForPermit2({
    token,
    account,
    amount,
  }: {
    token: Token & { address: `0x${string}` };
    account: `0x${string}`;
    amount: bigint;
  }) {
    if (!walletClient) throw new Error("No wallet client available");
    if (!publicClient) throw new Error("No public client available");

    // Step 1: Check current ERC20 allowance for Permit2 contract
    let currentAllowance;
    try {
      currentAllowance = await readContract(publicClient, {
        address: token.address,
        abi: erc20Abi,
        functionName: "allowance",
        args: [account, permit2Address],
      });
    } catch (error) {
      throw new Error(`Failed to read ERC20 allowance: ${(error as Error).message}`);
    }

    console.log("ERC20 allowance to Permit2:", currentAllowance.toString());

    // If current allowance is less than required amount, approve max allowance
    if (currentAllowance < amount) {
      try {
        const txHash = await writeContract(walletClient, {
          account,
          address: token.address,
          abi: erc20Abi,
          functionName: "approve",
          args: [permit2Address, MAX_UINT256],
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log(
          "ERC20 approve receipt:",
          JSON.stringify(receipt, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)
        );
      } catch (error) {
        throw new Error(`Failed to confirm ERC20 approve: ${(error as Error).message}`);
      }
    }

    // Step 2: Check current Permit2 allowance and expiration for Universal Router
    const ethersProvider = new providers.JsonRpcProvider(publicClient?.transport?.url);
    const allowanceProvider = new AllowanceProvider(ethersProvider, permit2Address);

    let allowanceData;
    try {
      allowanceData = await allowanceProvider.getAllowanceData(
        token.address,
        account,
        universalRouterAddress
      );
    } catch (error) {
      throw new Error(`Failed to get Permit2 allowance data: ${(error as Error).message}`);
    }

    const { amount: rawPermit2Allowance, expiration: currentPermit2Expiration } = allowanceData;
    const currentPermit2Allowance = rawPermit2Allowance.toBigInt();

    console.log("Permit2 allowance to UniversalRouter:", currentPermit2Allowance.toString());
    console.log("Permit2 allowance expiration:", currentPermit2Expiration.toString());

    // If current Permit2 allowance is less than required amount or expiration is near, approve max allowance
    if (currentPermit2Allowance < amount || currentPermit2Expiration < currentTimestampInSeconds + 60) {
      try {
        const txHashPermit2 = await writeContract(walletClient, {
          account,
          address: permit2Address,
          abi: permit2Abi,
          functionName: "approve",
          args: [token.address, universalRouterAddress, MAX_UINT160, permit2ExpirationTimestamp],
        });
        const receiptPermit2 = await publicClient.waitForTransactionReceipt({ hash: txHashPermit2 });
        console.log(
          "Permit2 approve receipt:",
          JSON.stringify(receiptPermit2, (_, v) => (typeof v === "bigint" ? v.toString() : v), 2)
        );
      } catch (error) {
        throw new Error(`Failed to confirm Permit2 approve: ${(error as Error).message}`);
      }
    }
  }

  return {
    approveTokenForPermit2,
  };
}
