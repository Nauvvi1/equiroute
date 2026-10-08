export type BinanceEnvelope<T> = {
  code: number;
  msg: string;
  data: T;
  timestamp: number;
  success: boolean;
};

export type MarketStatus = {
  openState: boolean;
  marketStatus: 'premarket' | 'regular' | 'postmarket' | 'overnight' | 'closed' | 'pause' | string;
  reasonCode: string | null;
  reasonMsg: string | null;
  nextOpenTime: number | null;
  nextCloseTime: number | null;
};

export type RwaToken = {
  binanceChainId: string;
  tokenContractAddress: string;
  platformId: string;
  assetType: number;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUrl?: string;
  decimals: string | number;
  underlyingTicker: string;
  underlyingName: string;
  tokenToShareRatio: string;
  statusInfo: MarketStatus;
  tokenPrice: string;
  referencePrice: string;
  volume24H?: string;
  marketCap?: string;
};

export type QuoteToken = {
  tokenContractAddress: string;
  tokenSymbol: string;
  tokenUnitPrice: string;
  decimal: string;
  isHoneyPot?: boolean;
  taxRate?: string;
};

export type QuoteRoute = {
  quoteId: string;
  vendorName: string;
  binanceChainId: string;
  fromTokenAmount: string;
  toTokenAmount: string;
  tradeFee: string | null;
  estimateGasFee: string | null;
  priceImpactPercent: string | null;
  router: string;
  fromToken: QuoteToken;
  toToken: QuoteToken;
  executionMode: 'SWAP' | 'RFQ' | string;
  approveTarget: string | null;
  isBest: boolean;
};

export type ApproveTransaction = {
  data: string;
  dexContractAddress: string;
  gasLimit: string;
  gasPrice: string;
};

export type SimulationResult = {
  status: string;
  failReason: string | null;
  balanceChanges: Array<{
    contractAddress: string;
    tokenType: string;
    change: string;
    owner: string;
  }>;
  allowanceChanges: Array<{
    tokenAddress: string;
    owner: string;
    spender: string;
    preAmount: string;
    postAmount: string;
  }>;
};
