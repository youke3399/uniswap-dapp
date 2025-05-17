import { NextRequest, NextResponse } from 'next/server'
import { AlphaRouter, SwapType } from '@uniswap/smart-order-router'
import { UniversalRouterVersion } from '@uniswap/universal-router-sdk'
import { Token, CurrencyAmount, TradeType, Percent, Ether, NativeCurrency } from '@uniswap/sdk-core'
import JSBI from 'jsbi'
import { ethers } from 'ethers'

const CHAIN_CONFIG = {
    1: {
        rpcUrl: process.env.JSON_RPC_PROVIDER!,
    },
    42161: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_ARBITRUM_ONE!,
    },
    10: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_OPTIMISM!,
    },
    8453: {
        rpcUrl: process.env.JSON_RPC_PROVIDER_BASE!,
    },
}

export async function POST(req: NextRequest) {
    try {
        const {
            inToken,
            outToken,
            amount,
            tradeType,
            recipient
        }: {
            inToken: Token | NativeCurrency
            outToken: Token | NativeCurrency
            amount: string
            tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT'
            recipient: `0x${string}`
        } = await req.json()

        if (!inToken || !outToken || !amount || !recipient) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const chainId = inToken.chainId
        const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG]

        if (!config) {
            return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 })
        }

        const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl)
        const router = new AlphaRouter({
            chainId,
            provider,
        })

        const amountIn = CurrencyAmount.fromRawAmount(
            inToken,
            JSBI.BigInt(amount)
        )

        const route = await router.route(
            amountIn,
            outToken,
            tradeType === 'EXACT_OUTPUT' ? TradeType.EXACT_OUTPUT : TradeType.EXACT_INPUT,
            {
                recipient,
                slippageTolerance: new Percent(50, 10_000), // 0.50% slippage
                type: SwapType.UNIVERSAL_ROUTER,
                version: UniversalRouterVersion.V2_0,
            }
        )

        if (!route || !route.methodParameters) {
            return NextResponse.json({ error: 'No route found' }, { status: 400 })
        }

        return NextResponse.json({
            quote: route.quote.toExact(),
            route: route.route.map((r) => r.tokenPath.map((t) => t.symbol)),
            estimatedGas: route.estimatedGasUsed.toString(),
            gasUsd: route.estimatedGasUsedUSD.toExact(),
            calldata: route.methodParameters.calldata,
            value: route.methodParameters.value.toString(),
        })
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
    }
}