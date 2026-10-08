export type GuardVerdict = 'ALLOW' | 'CAUTION' | 'BLOCK';

export type AnalysisRequest = {
  symbol: string;
  amountUsd: number;
  maxPremiumPercent: number;
  walletAddress?: string;
};

export type CandidateAnalysis = {
  platformId: string;
  providerName: string;
  tokenSymbol: string;
  tokenAddress: string;
  tokenPriceUsd: number;
  referencePriceUsd: number;
  onChainDeviationPercent: number;
  marketStatus: string;
  marketOpen: boolean;
  nextOpenTime: number | null;
  quoteAvailable: boolean;
  quoteError?: string;
  vendorName?: string;
  executionMode?: string;
  estimatedTokensOut?: number;
  estimatedUnderlyingShares?: number;
  expectedReferenceValueUsd?: number;
  tradeFeeUsd?: number;
  priceImpactPercent?: number;
  allInPremiumPercent?: number;
  estimatedExecutionLossUsd?: number;
  quoteId?: string;
  approveSimulation?: {
    attempted: boolean;
    status?: string;
    failReason?: string | null;
  };
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
  candidates: CandidateAnalysis[];
  warnings: string[];
  methodology: string[];
};
