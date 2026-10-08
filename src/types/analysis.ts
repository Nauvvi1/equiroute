export type GuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export type AnalysisRequest = {
  symbol: string;
  amountUsd: number;
  maxPremiumPercent: number;
  walletAddress?: string;
  deepScan?: boolean;
};

export type ApiTrace = {
  module: 'RWA' | 'Trading' | 'Transaction' | 'Wallet' | 'Market' | 'Other';
  operation: string;
  method: string;
  durationMs: number;
  success: boolean;
  status?: number;
  code?: number;
  attempt: number;
};

export type WalletReadiness = {
  checked: boolean;
  usdtBalance?: number;
  bnbBalance?: number;
  bnbValueUsd?: number;
  estimatedNetworkFeeUsd?: number;
  gasSafetyBufferUsd?: number;
  hasEnoughUsdt?: boolean;
  hasGas?: boolean;
  error?: string;
};

export type CandidateAnalysis = {
  platformId: string;
  providerName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenPriceUsd: number;
  referencePriceUsd: number;
  tokenPriceUpdatedAt?: number | null;
  onChainDeviationPercent: number;
  marketStatus: string;
  marketOpen: boolean;
  marketReason?: string | null;
  nextOpenTime: number | null;
  nextCloseTime?: number | null;
  quoteAvailable: boolean;
  quoteError?: string;
  vendorName?: string;
  executionMode?: string;
  estimatedTokensOut?: number;
  estimatedUnderlyingShares?: number;
  expectedReferenceValueUsd?: number;
  netReferenceValueUsd?: number;
  tradeFeeUsd?: number;
  priceImpactPercent?: number;
  allInPremiumPercent?: number;
  executionSurprisePercent?: number;
  estimatedExecutionLossUsd?: number;
  quoteId?: string;
  routeVerdict: GuardVerdict;
  routeReason: string;
  approveSimulation?: {
    attempted: boolean;
    status?: string;
    failReason?: string | null;
  };
};


export type LiquidityStressRoute = {
  providerName: string;
  tokenSymbol: string;
  tokenAddress: string;
  quoteAvailable: boolean;
  basePremiumPercent?: number;
  stressedPremiumPercent?: number;
  deteriorationPercent?: number;
  stressedPriceImpactPercent?: number;
  error?: string;
};

export type LiquidityStress = {
  multiplier: number;
  baseAmountUsd: number;
  stressedAmountUsd: number;
  routes: LiquidityStressRoute[];
};

export type AgenticHandoff = {
  status: 'READY' | 'CAUTION' | 'BLOCKED';
  instruction: string;
  bestTokenSymbol?: string;
  bestTokenAddress?: string;
  requiresExplicitConfirmation: boolean;
};

export type GuardAnalysis = {
  mode: 'demo' | 'live';
  symbol: string;
  companyName: string;
  amountUsd: number;
  maxPremiumPercent: number;
  verdict: GuardVerdict;
  verdictReason: string;
  generatedAt: string;
  bestCandidate: CandidateAnalysis | null;
  alternativeCandidate: CandidateAnalysis | null;
  routeSavingsUsd: number | null;
  liquidityStress?: LiquidityStress | null;
  candidates: CandidateAnalysis[];
  walletReadiness: WalletReadiness;
  agenticHandoff: AgenticHandoff;
  warnings: string[];
  methodology: string[];
  telemetry: ApiTrace[];
};
