import { env, isDemoMode } from '../config/env.js';
import { BinanceApiError } from '../lib/binanceClient.js';
import { rwaService } from './rwaService.js';
import { tradingService } from './tradingService.js';
import { createDemoAnalysis } from './demoData.js';
import type { AnalysisRequest, CandidateAnalysis, GuardAnalysis, GuardVerdict } from '../types/analysis.js';
import type { QuoteRoute, RwaToken } from '../types/binance.js';

function providerName(platformId: string): string {
  if (platformId === 'ondo') return 'Ondo';
  if (platformId === 'bstock') return 'bStocks';
  return platformId;
}

function toNumber(value: string | number | null | undefined, fallback = 0): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function amountToSmallestUnit(amount: number, decimals: number): string {
  const fixed = amount.toFixed(Math.min(decimals, 8));
  const [whole, fraction = ''] = fixed.split('.');
  return `${whole}${fraction.padEnd(decimals, '0')}`.replace(/^0+(?=\d)/, '') || '0';
}

function tokenAmountFromSmallestUnit(raw: string, decimals: number): number {
  if (!/^\d+$/.test(raw)) return 0;
  if (decimals <= 0) return Number(raw);
  const padded = raw.padStart(decimals + 1, '0');
  const whole = padded.slice(0, -decimals) || '0';
  const fraction = padded.slice(-decimals);
  return Number(`${whole}.${fraction}`);
}

function calculateCandidate(token: RwaToken, quote: QuoteRoute, amountUsd: number): CandidateAnalysis {
  const referencePrice = toNumber(token.referencePrice);
  const tokenPrice = toNumber(token.tokenPrice);
  const ratio = toNumber(token.tokenToShareRatio, 1) || 1;
  const tokenDecimals = Number(token.decimals) || Number(quote.toToken.decimal) || 18;
  const tokensOut = tokenAmountFromSmallestUnit(quote.toTokenAmount, tokenDecimals);
  const underlyingShares = tokensOut * ratio;
  const referenceValue = underlyingShares * referencePrice;
  const tradeFeeUsd = Math.max(0, toNumber(quote.tradeFee));
  const inputUnitPrice = toNumber(quote.fromToken.tokenUnitPrice, 1) || 1;
  const inputValueUsd = amountUsd * inputUnitPrice;
  const allInCost = inputValueUsd + tradeFeeUsd;
  const premium = referenceValue > 0 ? ((allInCost / referenceValue) - 1) * 100 : Number.POSITIVE_INFINITY;
  const loss = Math.max(0, allInCost - referenceValue);
  const deviation = referencePrice > 0 ? ((tokenPrice / referencePrice) - 1) * 100 : 0;

  return {
    platformId: token.platformId,
    providerName: providerName(token.platformId),
    tokenSymbol: token.tokenSymbol,
    tokenAddress: token.tokenContractAddress,
    tokenPriceUsd: tokenPrice,
    referencePriceUsd: referencePrice,
    onChainDeviationPercent: deviation,
    marketStatus: token.statusInfo?.marketStatus || 'unknown',
    marketOpen: Boolean(token.statusInfo?.openState),
    nextOpenTime: token.statusInfo?.nextOpenTime ?? null,
    quoteAvailable: true,
    vendorName: quote.vendorName,
    executionMode: quote.executionMode,
    estimatedTokensOut: tokensOut,
    estimatedUnderlyingShares: underlyingShares,
    expectedReferenceValueUsd: referenceValue,
    tradeFeeUsd,
    priceImpactPercent: Math.abs(toNumber(quote.priceImpactPercent)),
    allInPremiumPercent: premium,
    estimatedExecutionLossUsd: loss,
    quoteId: quote.quoteId
  };
}

function baseCandidate(token: RwaToken, error: string): CandidateAnalysis {
  const referencePrice = toNumber(token.referencePrice);
  const tokenPrice = toNumber(token.tokenPrice);
  return {
    platformId: token.platformId,
    providerName: providerName(token.platformId),
    tokenSymbol: token.tokenSymbol,
    tokenAddress: token.tokenContractAddress,
    tokenPriceUsd: tokenPrice,
    referencePriceUsd: referencePrice,
    onChainDeviationPercent: referencePrice > 0 ? ((tokenPrice / referencePrice) - 1) * 100 : 0,
    marketStatus: token.statusInfo?.marketStatus || 'unknown',
    marketOpen: Boolean(token.statusInfo?.openState),
    nextOpenTime: token.statusInfo?.nextOpenTime ?? null,
    quoteAvailable: false,
    quoteError: error
  };
}

async function analyzeToken(token: RwaToken, request: AnalysisRequest, amountSmallestUnit: string): Promise<CandidateAnalysis> {
  if (!request.walletAddress) {
    return baseCandidate(token, 'Wallet address is required for live RWA/RFQ execution quotes.');
  }

  try {
    const routes = await tradingService.quote({
      toTokenAddress: token.tokenContractAddress,
      amountSmallestUnit,
      walletAddress: request.walletAddress
    });

    const bestRoute = routes.find((route) => route.isBest) || routes[0];
    if (!bestRoute) return baseCandidate(token, 'No executable route returned by the Trading API.');

    const candidate = calculateCandidate(token, bestRoute, request.amountUsd);

    // RWA routes are commonly RFQ. We still dry-run the approval transaction through
    // the Transaction API so the project demonstrates a real pre-trade safety check.
    try {
      const approval = await tradingService.buildApproval({
        amountSmallestUnit,
        vendorName: bestRoute.vendorName
      });
      if (approval) {
        const simulation = await tradingService.simulateApproval({
          walletAddress: request.walletAddress,
          approval
        });
        candidate.approveSimulation = {
          attempted: true,
          status: simulation.status,
          failReason: simulation.failReason
        };
      }
    } catch (error) {
      candidate.approveSimulation = {
        attempted: true,
        status: 'UNAVAILABLE',
        failReason: error instanceof Error ? error.message : 'Approval simulation failed'
      };
    }

    return candidate;
  } catch (error) {
    const message = error instanceof BinanceApiError || error instanceof Error ? error.message : 'Quote request failed';
    return baseCandidate(token, message);
  }
}

function decide(best: CandidateAnalysis | null, maxPremium: number): { verdict: GuardVerdict; reason: string } {
  if (!best) {
    return { verdict: 'BLOCK', reason: 'No executable tokenized-stock route is currently available.' };
  }

  if (!best.quoteAvailable || best.allInPremiumPercent === undefined) {
    return { verdict: 'BLOCK', reason: 'Execution guard cannot verify an executable quote, so the trade is blocked by default.' };
  }

  if (best.allInPremiumPercent > maxPremium) {
    return {
      verdict: 'BLOCK',
      reason: `Best route is ${best.allInPremiumPercent.toFixed(2)}% worse than Binance reference, above your ${maxPremium.toFixed(2)}% limit.`
    };
  }

  if (!best.marketOpen) {
    return {
      verdict: 'CAUTION',
      reason: `Execution is inside your ${maxPremium.toFixed(2)}% limit, but the underlying market is ${best.marketStatus}.`
    };
  }

  return {
    verdict: 'ALLOW',
    reason: `Best executable route is inside your ${maxPremium.toFixed(2)}% execution-premium limit.`
  };
}

export class ExecutionGuardService {
  async analyze(request: AnalysisRequest): Promise<GuardAnalysis> {
    if (isDemoMode()) {
      return createDemoAnalysis(request);
    }

    const tokens = await rwaService.findByTicker(request.symbol);
    if (!tokens.length) {
      return {
        mode: 'live',
        symbol: request.symbol.toUpperCase(),
        companyName: request.symbol.toUpperCase(),
        amountUsd: request.amountUsd,
        maxPremiumPercent: request.maxPremiumPercent,
        verdict: 'BLOCK',
        verdictReason: 'No BSC tokenized-stock representation was returned by the Binance RWA Data API.',
        generatedAt: new Date().toISOString(),
        bestCandidate: null,
        candidates: [],
        warnings: [],
        methodology: []
      };
    }

    const amountSmallestUnit = amountToSmallestUnit(request.amountUsd, env.bscUsdtDecimals);
    const candidates: CandidateAnalysis[] = [];

    // Small sequential loop keeps us comfortably below per-endpoint RPS limits.
    for (const token of tokens) {
      candidates.push(await analyzeToken(token, request, amountSmallestUnit));
    }

    candidates.sort((a, b) => {
      const aPremium = a.allInPremiumPercent ?? Number.POSITIVE_INFINITY;
      const bPremium = b.allInPremiumPercent ?? Number.POSITIVE_INFINITY;
      return aPremium - bPremium;
    });

    const best = candidates.find((candidate) => candidate.quoteAvailable) || null;
    const decision = decide(best, request.maxPremiumPercent);
    const warnings: string[] = [
      'Reference price is the Binance Web3 RWA API reference value; it is not represented as an official exchange order-book quote.',
      'RWA/equity routes can use RFQ/EIP-712 execution. EquiRoute dry-runs the approval transaction but never broadcasts or signs a trade.'
    ];

    if (!request.walletAddress) {
      warnings.unshift('Add a BSC wallet address to request live RFQ execution quotes.');
    }

    if (tokens.every((token) => token.platformId !== 'bstock')) {
      warnings.push('Only the representations currently returned by the Binance RWA Data API are compared.');
    }

    return {
      mode: 'live',
      symbol: request.symbol.toUpperCase(),
      companyName: tokens[0].underlyingName || request.symbol.toUpperCase(),
      amountUsd: request.amountUsd,
      maxPremiumPercent: request.maxPremiumPercent,
      verdict: decision.verdict,
      verdictReason: decision.reason,
      generatedAt: new Date().toISOString(),
      bestCandidate: best,
      candidates,
      warnings,
      methodology: [
        'Load BSC tokenized-stock representations from Binance Web3 RWA Data API.',
        'Compare each on-chain token price with the Binance RWA reference price and market status.',
        'Request an executable USDT → tokenized-stock quote from the Trading API.',
        'Convert quoted token output into underlying-share exposure using tokenToShareRatio.',
        'Estimate all-in execution premium including the quote-reported network fee.',
        'Block the trade when the best verified route exceeds the user-defined limit.',
        'Build and simulate the required ERC-20 approval with the Transaction API; no transaction is broadcast.'
      ]
    };
  }
}

export const executionGuardService = new ExecutionGuardService();

export const executionGuardMath = { amountToSmallestUnit, tokenAmountFromSmallestUnit, calculateCandidate };
