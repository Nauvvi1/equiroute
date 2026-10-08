import type { GuardAnalysis } from '../types/analysis.js';

export function createDemoAnalysis(params: {
  symbol: string;
  amountUsd: number;
  maxPremiumPercent: number;
}): GuardAnalysis {
  const symbol = params.symbol.toUpperCase();
  const reference = symbol === 'TSLA' ? 431.52 : symbol === 'AAPL' ? 248.18 : 184.20;

  const candidates = [
    {
      platformId: 'ondo',
      providerName: 'Ondo',
      tokenSymbol: `${symbol}on`,
      tokenAddress: '0x1111111111111111111111111111111111111111',
      tokenPriceUsd: reference * 1.002,
      referencePriceUsd: reference,
      onChainDeviationPercent: 0.20,
      marketStatus: 'closed',
      marketOpen: false,
      nextOpenTime: Date.now() + 3 * 60 * 60 * 1000,
      quoteAvailable: true,
      vendorName: 'PcsXRfq',
      executionMode: 'RFQ',
      estimatedTokensOut: params.amountUsd / reference / 1.006,
      estimatedUnderlyingShares: params.amountUsd / reference / 1.006,
      expectedReferenceValueUsd: params.amountUsd / 1.006,
      tradeFeeUsd: 0.12,
      priceImpactPercent: 0.18,
      allInPremiumPercent: 0.72,
      estimatedExecutionLossUsd: params.amountUsd * 0.0072,
      quoteId: 'demo-ondo',
      approveSimulation: { attempted: true, status: 'SUCCESS', failReason: null }
    },
    {
      platformId: 'bstock',
      providerName: 'bStocks',
      tokenSymbol: `${symbol}B`,
      tokenAddress: '0x2222222222222222222222222222222222222222',
      tokenPriceUsd: reference * 1.013,
      referencePriceUsd: reference,
      onChainDeviationPercent: 1.30,
      marketStatus: 'closed',
      marketOpen: false,
      nextOpenTime: Date.now() + 3 * 60 * 60 * 1000,
      quoteAvailable: true,
      vendorName: 'LiquidMesh',
      executionMode: 'RFQ',
      estimatedTokensOut: params.amountUsd / reference / 1.024,
      estimatedUnderlyingShares: params.amountUsd / reference / 1.024,
      expectedReferenceValueUsd: params.amountUsd / 1.024,
      tradeFeeUsd: 0.18,
      priceImpactPercent: 0.74,
      allInPremiumPercent: 2.58,
      estimatedExecutionLossUsd: params.amountUsd * 0.0258,
      quoteId: 'demo-bstock',
      approveSimulation: { attempted: true, status: 'SUCCESS', failReason: null }
    }
  ];

  const best = candidates[0];
  const blocked = (best.allInPremiumPercent || 0) > params.maxPremiumPercent;

  return {
    mode: 'demo',
    symbol,
    companyName: symbol === 'NVDA' ? 'NVIDIA Corporation' : `${symbol} underlying equity`,
    amountUsd: params.amountUsd,
    maxPremiumPercent: params.maxPremiumPercent,
    verdict: blocked ? 'BLOCK' : 'CAUTION',
    verdictReason: blocked
      ? `Best route is still ${best.allInPremiumPercent.toFixed(2)}% worse than Binance reference, above your ${params.maxPremiumPercent.toFixed(2)}% limit.`
      : `Best route is inside your ${params.maxPremiumPercent.toFixed(2)}% limit, but the underlying market is closed.`,
    generatedAt: new Date().toISOString(),
    bestCandidate: best,
    candidates,
    warnings: [
      'Demo mode uses illustrative numbers. Add Binance Web3 API credentials to .env for live quotes.',
      'The Binance RWA reference price is the API reference value, not an exchange order-book quote.'
    ],
    methodology: [
      'Compare the token price with the Binance RWA reference price.',
      'Request an executable USDT → tokenized-stock quote from the Binance Web3 Trading API.',
      'Convert quoted token output to underlying-share exposure using tokenToShareRatio.',
      'Estimate all-in execution premium and block routes above the user-defined guard limit.',
      'Dry-run the ERC-20 approval through the Transaction API; RWA execution itself uses RFQ/EIP-712.'
    ]
  };
}
