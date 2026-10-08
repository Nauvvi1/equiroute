import { binanceClient } from '../lib/binanceClient.js';
import { env } from '../config/env.js';
import type { ApproveTransaction, QuoteRoute, SimulationResult } from '../types/binance.js';

export class TradingService {
  async quote(params: {
    toTokenAddress: string;
    amountSmallestUnit: string;
    walletAddress: string;
  }): Promise<QuoteRoute[]> {
    return binanceClient.get<QuoteRoute[]>('/api/v1/dex/aggregator/quote', {
      binanceChainId: env.bscChainId,
      amount: params.amountSmallestUnit,
      fromTokenAddress: env.bscUsdtAddress,
      toTokenAddress: params.toTokenAddress,
      userWalletAddress: params.walletAddress
    });
  }

  async buildApproval(params: {
    amountSmallestUnit: string;
    vendorName: string;
  }): Promise<ApproveTransaction | null> {
    const rows = await binanceClient.get<ApproveTransaction[]>('/api/v1/dex/aggregator/approve-transaction', {
      binanceChainId: env.bscChainId,
      tokenContractAddress: env.bscUsdtAddress,
      approveAmount: params.amountSmallestUnit,
      vendor: params.vendorName
    });

    return rows[0] || null;
  }

  async simulateApproval(params: {
    walletAddress: string;
    approval: ApproveTransaction;
  }): Promise<SimulationResult> {
    return binanceClient.post<SimulationResult>('/api/v1/dex/pre-transaction/simulate', {
      binanceChainId: env.bscChainId,
      evmTx: {
        from: params.walletAddress,
        to: env.bscUsdtAddress,
        value: '0',
        data: params.approval.data
      }
    });
  }
}

export const tradingService = new TradingService();
