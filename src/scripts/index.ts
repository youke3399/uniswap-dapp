import { createWalletClient, http, parseAbi, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet } from 'viem/chains';

const usdt = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
const weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const recipient = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';
const router = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const privateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const account = privateKeyToAccount(privateKey as `0x${string}`);

const client = createWalletClient({
  account,
  chain: mainnet,
  transport: http('http://127.0.0.1:8545'),
});

const erc20Abi = parseAbi([
  'function approve(address spender, uint256 amount) external returns (bool)',
]);

const exactInputSingleABI = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut)',
]);

const unwrapWETH9ABI = parseAbi([
  'function unwrapWETH9(uint256 amountMinimum, address recipient)',
]);

const multicallABI = parseAbi([
  'function multicall(bytes[] data)',
]);

async function main() {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600000); // 10 分钟后

  // 1. Approve USDT to Router
/*   const approveData = encodeFunctionData({
    abi: erc20Abi,
    functionName: 'approve',
    args: [router, BigInt(10000 * 1e6)],
  });

  const approveTxHash = await client.sendTransaction({
    to: usdt,
    data: approveData,
  });

  console.log('Approve tx sent:', approveTxHash); */

  // 2. Swap USDT -> WETH
  const exactInputSingleData = encodeFunctionData({
    abi: exactInputSingleABI,
    functionName: 'exactInputSingle',
    args: [{
      tokenIn: usdt,
      tokenOut: weth,
      fee: 3000,
      recipient: router,
      deadline,
      amountIn: BigInt(1000 * 1e6), // 1000 USDT
      amountOutMinimum: 0n,
      sqrtPriceLimitX96: 0n,
    }]
  });

  const unwrapData = encodeFunctionData({
    abi: unwrapWETH9ABI,
    functionName: 'unwrapWETH9',
    args: [0n, recipient],
  });

  const multicallData = encodeFunctionData({
    abi: multicallABI,
    functionName: 'multicall',
    args: [[exactInputSingleData, unwrapData]],
  });

  const txHash = await client.sendTransaction({
    to: router,
    data: multicallData,
  });

  console.log('Multicall tx sent: ', txHash);
}

main().catch(console.error);