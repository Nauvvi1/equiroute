import { env, isDemoMode } from '../config/env.js';
import { BinanceApiError } from '../lib/binanceClient.js';
import { rwaService } from './rwaService.js';
import { tradingService } from './tradingService.js';
import { walletService } from './walletService.js';
import { createDemoAnalysis } from './demoData.js';
import type { AnalysisRequest, CandidateAnalysis, GuardAnalysis, GuardVerdict, LiquidityStress, WalletReadiness } from '../types/analysis.js';
import type { QuoteRoute, RwaToken } from '../types/binance.js';

function providerName(platformId: string): string {
  if (platformId === 'ondo') return 'Ondo';
  if (platformId === 'bstock') return 'bStocks';
  if (platformId === 'xstocks' || platformId === 'xstock') return 'xStocks';
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


function normalizedCandidateMarketStatus(token: RwaToken): string {
  const explicit = token.statusInfo?.marketStatus?.trim();
  if (explicit) return explicit;
  if (token.statusInfo?.openState === true) return 'regular';
  if (token.statusInfo?.openState === false) return 'closed';
  return 'unknown';
}

function marketIsHardBlocked(status: string): boolean {
  const normalized = status.toLowerCase();
  return ['pause', 'paused', 'halt', 'halted', 'suspended'].some((value) => normalized.includes(value));
}

function routeDecision(candidate: Omit<CandidateAnalysis, 'routeVerdict' | 'routeReason'>, maxPremium: number): { verdict: GuardVerdict; reason: string } {
  if (!candidate.quoteAvailable || candidate.allInPremiumPercent === undefined) {
    return { verdict: 'BLOCK', reason: 'No executable quote could be verified.' };
  }
  if (marketIsHardBlocked(candidate.marketStatus)) {
    return { verdict: 'BLOCK', reason: `Underlying/token status is ${candidate.marketStatus}; do not execute.` };
  }
  if (candidate.approveSimulation?.attempted && candidate.approveSimulation.status && candidate.approveSimulation.status !== 'SUCCESS') {
    return { verdict: 'BLOCK', reason: 'Required approval did not pass Transaction API simulation.' };
  }
  if (candidate.allInPremiumPercent > maxPremium) {
    return { verdict: 'BLOCK', reason: `${candidate.allInPremiumPercent.toFixed(2)}% execution premium exceeds the ${maxPremium.toFixed(2)}% policy.` };
  }
  if (!candidate.marketOpen) {
    return { verdict: 'CAUTION', reason: `Price policy passes, but the underlying market is ${candidate.marketStatus}.` };
  }
  return { verdict: 'ALLOW', reason: 'Executable quote passes the user-defined premium policy.' };
}

function calculateCandidate(token: RwaToken, quote: QuoteRoute, amountUsd: number, maxPremium: number): CandidateAnalysis {
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
  const fairTokenValue = referencePrice * ratio;
  const deviation = fairTokenValue > 0 ? ((tokenPrice / fairTokenValue) - 1) * 100 : 0;

  const partial: Omit<CandidateAnalysis, 'routeVerdict' | 'routeReason'> = {
    platformId: token.platformId,
    providerName: providerName(token.platformId),
    tokenSymbol: token.tokenSymbol,
    tokenAddress: token.tokenContractAddress,
    tokenPriceUsd: tokenPrice,
    referencePriceUsd: referencePrice,
    tokenPriceUpdatedAt: token.tokenPriceUpdatedAt ?? null,
    onChainDeviationPercent: deviation,
    marketStatus: normalizedCandidateMarketStatus(token),
    marketOpen: Boolean(token.statusInfo?.openState),
    marketReason: token.statusInfo?.reasonMsg ?? token.statusInfo?.reasonCode ?? null,
    nextOpenTime: token.statusInfo?.nextOpenTime ?? null,
    nextCloseTime: token.statusInfo?.nextCloseTime ?? null,
    quoteAvailable: true,
    vendorName: quote.vendorName,
    executionMode: quote.executionMode,
    estimatedTokensOut: tokensOut,
    estimatedUnderlyingShares: underlyingShares,
    expectedReferenceValueUsd: referenceValue,
    netReferenceValueUsd: referenceValue - tradeFeeUsd,
    tradeFeeUsd,
    priceImpactPercent: Math.abs(toNumber(quote.priceImpactPercent)),
    allInPremiumPercent: premium,
    executionSurprisePercent: premium - deviation,
    estimatedExecutionLossUsd: loss,
    quoteId: quote.quoteId
  };
  const route = routeDecision(partial, maxPremium);
  return { ...partial, routeVerdict: route.verdict, routeReason: route.reason };
}

function baseCandidate(token: RwaToken, error: string): CandidateAnalysis {
  const referencePrice = toNumber(token.referencePrice);
  const tokenPrice = toNumber(token.tokenPrice);
  const ratio = toNumber(token.tokenToShareRatio, 1) || 1;
  const fairTokenValue = referencePrice * ratio;
  return {
    platformId: token.platformId,
    providerName: providerName(token.platformId),
    tokenSymbol: token.tokenSymbol,
    tokenAddress: token.tokenContractAddress,
    tokenPriceUsd: tokenPrice,
    referencePriceUsd: referencePrice,
    tokenPriceUpdatedAt: token.tokenPriceUpdatedAt ?? null,
    onChainDeviationPercent: fairTokenValue > 0 ? ((tokenPrice / fairTokenValue) - 1) * 100 : 0,
    marketStatus: normalizedCandidateMarketStatus(token),
    marketOpen: Boolean(token.statusInfo?.openState),
    marketReason: token.statusInfo?.reasonMsg ?? token.statusInfo?.reasonCode ?? null,
    nextOpenTime: token.statusInfo?.nextOpenTime ?? null,
    nextCloseTime: token.statusInfo?.nextCloseTime ?? null,
    quoteAvailable: false,
    quoteError: error,
    routeVerdict: 'BLOCK',
    routeReason: error
  };
}

async function analyzeToken(token: RwaToken, request: AnalysisRequest, amountSmallestUnit: string): Promise<CandidateAnalysis> {
  if (!request.walletAddress) return baseCandidate(token, 'Wallet address is required for live RFQ execution quotes.');

  try {
    const routes = await tradingService.quote({
      toTokenAddress: token.tokenContractAddress,
      amountSmallestUnit,
      walletAddress: request.walletAddress
    });
    const bestRoute = routes.find((route) => route.isBest) || routes[0];
    if (!bestRoute) return baseCandidate(token, 'No executable route returned by the Trading API.');

    let candidate = calculateCandidate(token, bestRoute, request.amountUsd, request.maxPremiumPercent);

    try {
      const approval = await tradingService.buildApproval({ amountSmallestUnit, vendorName: bestRoute.vendorName });
      if (approval) {
        const simulation = await tradingService.simulateApproval({ walletAddress: request.walletAddress, approval });
        candidate.approveSimulation = { attempted: true, status: simulation.status, failReason: simulation.failReason };
        const route = routeDecision(candidate, request.maxPremiumPercent);
        candidate = { ...candidate, routeVerdict: route.verdict, routeReason: route.reason };
      }
    } catch (error) {
      candidate.approveSimulation = {
        attempted: true,
        status: 'UNAVAILABLE',
        failReason: error instanceof Error ? error.message : 'Approval simulation failed'
      };
      // A failed/unavailable simulation does not invent a hard failure, but it also cannot remain a clean ALLOW.
      if (candidate.routeVerdict !== 'BLOCK') {
        candidate.routeVerdict = 'CAUTION';
        candidate.routeReason = `${candidate.routeReason} Approval simulation is unavailable; re-check before execution.`;
      }
    }

    return candidate;
  } catch (error) {
    const message = error instanceof BinanceApiError || error instanceof Error ? error.message : 'Quote request failed';
    return baseCandidate(token, message);
  }
}


function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiquidityStress(
  tokens: RwaToken[],
  baseCandidates: CandidateAnalysis[],
  request: AnalysisRequest
): Promise<LiquidityStress | null> {
  if (!request.deepScan || !request.walletAddress) return null;
  const multiplier = 5;
  const stressedAmountUsd = Math.min(request.amountUsd * multiplier, 1_000_000);
  if (stressedAmountUsd <= request.amountUsd) return null;
  const stressedSmallestUnit = amountToSmallestUnit(stressedAmountUsd, env.bscUsdtDecimals);
  const baseByAddress = new Map(baseCandidates.map((candidate) => [candidate.tokenAddress.toLowerCase(), candidate]));
  const routes: LiquidityStress['routes'] = [];

  for (const token of tokens) {
    const base = baseByAddress.get(token.tokenContractAddress.toLowerCase());
    try {
      // This is quote-only on purpose: no extra approval simulation or broadcast for a stress probe.
      const quotes = await tradingService.quote({
        toTokenAddress: token.tokenContractAddress,
        amountSmallestUnit: stressedSmallestUnit,
        walletAddress: request.walletAddress
      });
      const quote = quotes.find((route) => route.isBest) || quotes[0];
      if (!quote) throw new Error('No stressed-size route returned');
      const stressed = calculateCandidate(token, quote, stressedAmountUsd, request.maxPremiumPercent);
      routes.push({
        providerName: providerName(token.platformId),
        tokenSymbol: token.tokenSymbol,
        tokenAddress: token.tokenContractAddress,
        quoteAvailable: true,
        basePremiumPercent: base?.allInPremiumPercent,
        stressedPremiumPercent: stressed.allInPremiumPercent,
        deteriorationPercent: stressed.allInPremiumPercent !== undefined && base?.allInPremiumPercent !== undefined
          ? stressed.allInPremiumPercent - base.allInPremiumPercent
          : undefined,
        stressedPriceImpactPercent: stressed.priceImpactPercent
      });
    } catch (error) {
      routes.push({
        providerName: providerName(token.platformId),
        tokenSymbol: token.tokenSymbol,
        tokenAddress: token.tokenContractAddress,
        quoteAvailable: false,
        basePremiumPercent: base?.allInPremiumPercent,
        error: error instanceof Error ? error.message : 'Stress quote failed'
      });
    }
    // Keep the optional probe gentle on the quote endpoint even before elevated hackathon limits apply.
    await sleep(220);
  }

  return { multiplier, baseAmountUsd: request.amountUsd, stressedAmountUsd, routes };
}

function chooseBest(candidates: CandidateAnalysis[]): CandidateAnalysis | null {
  const verified = candidates.filter((candidate) => candidate.quoteAvailable && candidate.allInPremiumPercent !== undefined);
  const usable = verified.filter((candidate) => candidate.routeVerdict !== 'BLOCK');
  return usable[0] || verified[0] || null;
}

function refineGasReadiness(wallet: WalletReadiness, best: CandidateAnalysis | null): WalletReadiness {
  if (!wallet.checked || !best || best.tradeFeeUsd === undefined) return wallet;
  const estimatedNetworkFeeUsd = Math.max(0, best.tradeFeeUsd);
  const gasSafetyBufferUsd = estimatedNetworkFeeUsd * 1.25;
  if (wallet.bnbValueUsd !== undefined && wallet.bnbValueUsd > 0) {
    return {
      ...wallet,
      estimatedNetworkFeeUsd,
      gasSafetyBufferUsd,
      hasGas: wallet.bnbValueUsd >= gasSafetyBufferUsd
    };
  }
  return { ...wallet, estimatedNetworkFeeUsd, gasSafetyBufferUsd };
}

function overallDecision(best: CandidateAnalysis | null, wallet: WalletReadiness): { verdict: GuardVerdict; reason: string } {
  if (!best) return { verdict: 'BLOCK', reason: 'No executable tokenized-stock route is currently available.' };
  if (wallet.checked && wallet.hasEnoughUsdt === false) {
    return { verdict: 'BLOCK', reason: 'Wallet preflight found insufficient USDT for this order size.' };
  }
  if (wallet.checked && wallet.hasGas === false) {
    return { verdict: 'BLOCK', reason: 'Wallet preflight verified a zero native BNB balance for gas.' };
  }
  if (best.routeVerdict === 'BLOCK') return { verdict: 'BLOCK', reason: best.routeReason };
  if (!wallet.checked) {
    return { verdict: 'CAUTION', reason: `${best.routeReason} Wallet funding could not be verified, so execution readiness is uncertain.` };
  }
  return { verdict: best.routeVerdict, reason: best.routeReason };
}

function agenticHandoff(verdict: GuardVerdict, best: CandidateAnalysis | null, request: AnalysisRequest) {
  const status = verdict === 'ALLOW' ? 'READY' : verdict === 'CAUTION' ? 'CAUTION' : 'BLOCKED';
  if (!best || verdict === 'BLOCK') {
    return {
      status,
      requiresExplicitConfirmation: true,
      instruction: `EquiRoute policy result for ${request.symbol}: BLOCK. Do not execute this tokenized-stock trade. Re-check with a new live quote before any future attempt.`
    } as const;
  }
  return {
    status,
    bestTokenSymbol: best.tokenSymbol,
    bestTokenAddress: best.tokenAddress,
    requiresExplicitConfirmation: true,
    instruction: `EquiRoute checked ${request.symbol} for ${request.amountUsd} USDT. Best route: ${best.tokenSymbol} (${best.tokenAddress}), execution premium ${best.allInPremiumPercent?.toFixed(2)}%, policy limit ${request.maxPremiumPercent.toFixed(2)}%, verdict ${verdict}. Do not trade automatically. Ask for explicit user confirmation, then use Binance Agentic Wallet to buy exactly ${request.amountUsd} USDT of this verified token on BSC; if the quote changes, run EquiRoute again before execution.`
  } as const;
}

export class ExecutionGuardService {
  async analyze(request: AnalysisRequest): Promise<GuardAnalysis> {
    if (isDemoMode()) return createDemoAnalysis(request);

    const tokens = await rwaService.findByTicker(request.symbol);
    if (!tokens.length) {
      const wallet = { checked: false } as WalletReadiness;
      return {
        mode: 'live', symbol: request.symbol.toUpperCase(), companyName: request.symbol.toUpperCase(),
        amountUsd: request.amountUsd, maxPremiumPercent: request.maxPremiumPercent,
        verdict: 'BLOCK', verdictReason: 'No BSC tokenized-stock representation was returned by the Binance RWA Data API.',
        generatedAt: new Date().toISOString(), bestCandidate: null, alternativeCandidate: null, routeSavingsUsd: null,
        candidates: [], walletReadiness: wallet, liquidityStress: null,
        agenticHandoff: agenticHandoff('BLOCK', null, request), warnings: [], methodology: [], telemetry: []
      };
    }

    const wallet = request.walletAddress
      ? await walletService.readiness(request.walletAddress, request.amountUsd)
      : { checked: false, error: 'Add a BSC wallet address to verify funding and request live execution quotes.' };

    const amountSmallestUnit = amountToSmallestUnit(request.amountUsd, env.bscUsdtDecimals);
    const candidates: CandidateAnalysis[] = [];
    for (const token of tokens) candidates.push(await analyzeToken(token, request, amountSmallestUnit));

    candidates.sort((a, b) => (a.allInPremiumPercent ?? Number.POSITIVE_INFINITY) - (b.allInPremiumPercent ?? Number.POSITIVE_INFINITY));
    const best = chooseBest(candidates);
    const executable = candidates.filter((candidate) => candidate.quoteAvailable && candidate !== best);
    const alternative = executable[0] || null;
    const routeSavingsUsd = best?.netReferenceValueUsd !== undefined && alternative?.netReferenceValueUsd !== undefined
      ? Math.max(0, best.netReferenceValueUsd - alternative.netReferenceValueUsd)
      : null;

    const liquidityStress = await runLiquidityStress(tokens, candidates, request);

    const refinedWallet = refineGasReadiness(wallet, best);
    const decision = overallDecision(best, refinedWallet);
    const warnings: string[] = [
      'Reference price is Binance Web3 RWA API reference data, not a guaranteed exchange fill.',
      'RWA routes may use RFQ/EIP-712. EquiRoute never asks for a seed phrase/private key and does not broadcast a trade.',
      'Agentic execution is deliberately gated: BLOCK is a hard stop; CAUTION/ALLOW still require explicit user confirmation.'
    ];
    if (!wallet.checked && wallet.error) warnings.unshift(wallet.error);

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
      alternativeCandidate: alternative,
      routeSavingsUsd,
      candidates,
      walletReadiness: refinedWallet,
      liquidityStress,
      agenticHandoff: agenticHandoff(decision.verdict, best, request),
      warnings,
      methodology: [
        'Load BSC tokenized-stock representations from Binance Web3 RWA Data API.',
        'Refresh token/reference prices and hydrate underlying market status.',
        'Check wallet USDT and BNB readiness with Wallet API.',
        'Request a live USDT → tokenized-stock RFQ/route from Trading API.',
        'Convert quoted token output into underlying-share exposure using tokenToShareRatio.',
        'Compare displayed token/reference gap with the actual executable premium.',
        'Dry-run the required ERC-20 approval through Transaction API when available.',
        'Optionally re-quote the same representations at 5× order size to expose liquidity sensitivity without broadcasting.',
        'Apply the user policy and fail closed when execution quality cannot be verified.'
      ],
      telemetry: []
    };
  }
}

export const executionGuardMath = { amountToSmallestUnit, tokenAmountFromSmallestUnit, calculateCandidate };
export const executionGuardService = new ExecutionGuardService();
