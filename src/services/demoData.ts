import type { GuardAnalysis } from '../types/analysis.js';

export function createDemoAnalysis(params: { symbol: string; amountUsd: number; maxPremiumPercent: number; deepScan?: boolean }): GuardAnalysis {
  const symbol = params.symbol.toUpperCase();
  const reference = symbol === 'TSLA' ? 431.52 : symbol === 'AAPL' ? 248.18 : 231.54;
  const make = (providerName: string, platformId: string, tokenSymbol: string, displayed: number, executable: number, impact: number) => {
    const routeVerdict = executable > params.maxPremiumPercent ? 'BLOCK' as const : 'CAUTION' as const;
    return {
      platformId, providerName, tokenSymbol,
      tokenAddress: platformId === 'ondo' ? '0x1111111111111111111111111111111111111111' : '0x2222222222222222222222222222222222222222',
      tokenPriceUsd: reference * (1 + displayed / 100), referencePriceUsd: reference,
      tokenPriceUpdatedAt: Date.now() - 10_000, onChainDeviationPercent: displayed,
      marketStatus: 'closed', marketOpen: false, marketReason: 'Weekend or Holiday', nextOpenTime: Date.now() + 3 * 60 * 60 * 1000,
      quoteAvailable: true, vendorName: 'RFQ', executionMode: 'RFQ', estimatedTokensOut: params.amountUsd / reference / (1 + executable / 100),
      estimatedUnderlyingShares: params.amountUsd / reference / (1 + executable / 100),
      expectedReferenceValueUsd: params.amountUsd / (1 + executable / 100), netReferenceValueUsd: params.amountUsd / (1 + executable / 100), tradeFeeUsd: 0,
      priceImpactPercent: impact, allInPremiumPercent: executable, executionSurprisePercent: executable - displayed,
      estimatedExecutionLossUsd: Math.max(0, params.amountUsd - params.amountUsd / (1 + executable / 100)),
      quoteId: `demo-${platformId}`, routeVerdict,
      routeReason: executable > params.maxPremiumPercent ? `${executable.toFixed(2)}% exceeds policy.` : 'Price policy passes; underlying market is closed.',
      approveSimulation: { attempted: true, status: 'SUCCESS', failReason: null }
    };
  };

  const candidates = [
    make('bStocks', 'bstock', `${symbol}B`, 0.08, -0.07, 0.00),
    make('Ondo', 'ondo', `${symbol}on`, 0.17, 1.32, 0.01)
  ];
  const best = candidates[0];
  const alt = candidates[1];
  const routeSavingsUsd = Math.max(0, (best.expectedReferenceValueUsd || 0) - (alt.expectedReferenceValueUsd || 0));
  const verdict = best.allInPremiumPercent! > params.maxPremiumPercent ? 'BLOCK' as const : 'CAUTION' as const;

  return {
    mode: 'demo', symbol, companyName: symbol === 'NVDA' ? 'NVIDIA Corporation' : `${symbol} underlying equity`,
    amountUsd: params.amountUsd, maxPremiumPercent: params.maxPremiumPercent, verdict,
    verdictReason: verdict === 'BLOCK' ? 'Best demo route exceeds your policy.' : 'Best route passes the price policy, but the underlying market is closed.',
    generatedAt: new Date().toISOString(), bestCandidate: best, alternativeCandidate: alt, routeSavingsUsd,
    candidates,
    liquidityStress: params.deepScan ? {
      multiplier: 5, baseAmountUsd: params.amountUsd, stressedAmountUsd: params.amountUsd * 5,
      routes: candidates.map((candidate, index) => ({
        providerName: candidate.providerName, tokenSymbol: candidate.tokenSymbol, tokenAddress: candidate.tokenAddress, quoteAvailable: true,
        basePremiumPercent: candidate.allInPremiumPercent,
        stressedPremiumPercent: Number(candidate.allInPremiumPercent || 0) + (index === 0 ? 0.18 : 0.92),
        deteriorationPercent: index === 0 ? 0.18 : 0.92,
        stressedPriceImpactPercent: Number(candidate.priceImpactPercent || 0) + (index === 0 ? 0.03 : 0.24)
      }))
    } : null,
    walletReadiness: { checked: true, usdtBalance: 850, bnbBalance: 0.04, bnbValueUsd: 40, estimatedNetworkFeeUsd: 0.12, gasSafetyBufferUsd: 0.15, hasEnoughUsdt: true, hasGas: true },
    agenticHandoff: {
      status: verdict === 'BLOCK' ? 'BLOCKED' : 'CAUTION', requiresExplicitConfirmation: true,
      bestTokenSymbol: best.tokenSymbol, bestTokenAddress: best.tokenAddress,
      instruction: `Demo policy handoff: ${verdict}. A real Agentic Wallet trade must be re-checked with a live quote and explicitly confirmed.`
    },
    warnings: ['Demo mode uses illustrative numbers. Configure fresh Binance Web3 API credentials for live data.'],
    methodology: ['RWA price → wallet preflight → executable RFQ quote → execution premium → transaction dry-run → policy verdict.'],
    telemetry: [
      { module: 'RWA', operation: 'tokens + price + underlying market', method: 'GET', durationMs: 188, success: true, status: 200, code: 0, attempt: 1 },
      { module: 'Wallet', operation: 'wallet readiness', method: 'GET', durationMs: 121, success: true, status: 200, code: 0, attempt: 1 },
      { module: 'Trading', operation: 'aggregated quote', method: 'GET', durationMs: 284, success: true, status: 200, code: 0, attempt: 1 },
      { module: 'Transaction', operation: 'approval simulation', method: 'POST', durationMs: 210, success: true, status: 200, code: 0, attempt: 1 }
    ]
  };
}
