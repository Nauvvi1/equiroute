export type TokenizedStockQuote = {
  symbol: string;
  provider: 'bStocks' | 'Ondo' | 'xStocks' | string;
  tokenSymbol: string;
  tokenAddress?: string;
  onChainPriceUsd?: number;
  referencePriceUsd?: number;
  deviationPercent?: number;
  liquidityUsd?: number;
  estimatedSlippagePercent?: number;
};

export type ExecutionRoute = {
  inputToken: string;
  outputToken: string;
  amountIn: string;
  estimatedAmountOut?: string;
  priceImpactPercent?: number;
  simulated?: boolean;
  provider?: string;
};
