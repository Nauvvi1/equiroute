import { binanceClient } from '../lib/binanceClient.js';
import { env } from '../config/env.js';
import { bscRpcService } from './bscRpcService.js';
import type { WalletReadiness } from '../types/analysis.js';
import type { WalletBalancePage } from '../types/binance.js';

function number(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

type BnbBalanceResult = { ok: true; balance: number } | { ok: false; error: unknown };

export class WalletService {
  async readiness(address: string, amountUsd: number): Promise<WalletReadiness> {
    try {
      // Binance Wallet API is used for the BEP-20 funding check. Native BNB is
      // deliberately verified with eth_getBalance: it is the canonical BSC gas
      // balance and must not be inferred from a paginated token-assets list.
      const bnbPromise: Promise<BnbBalanceResult> = bscRpcService.nativeBnbBalance(address).then(
        (balance): BnbBalanceResult => ({ ok: true, balance }),
        (error): BnbBalanceResult => ({ ok: false, error })
      );

      const [rows, bnbResult] = await Promise.all([
        binanceClient.post<WalletBalancePage[]>('/api/v1/dex/balance/token-balances-by-address', {
          address,
          tokenContractAddresses: [
            {
              binanceChainId: env.bscChainId,
              tokenContractAddress: env.bscUsdtAddress
            }
          ],
          excludeRiskToken: '0'
        }),
        bnbPromise
      ]);

      const assets = rows.flatMap((row) => row.tokenAssets || []);
      const usdt = assets.find((asset) => asset.tokenContractAddress?.toLowerCase() === env.bscUsdtAddress.toLowerCase());
      const usdtBalance = number(usdt?.balance);

      if (bnbResult.ok === false) {
        return {
          checked: true,
          usdtBalance,
          hasEnoughUsdt: usdtBalance >= amountUsd,
          hasGas: undefined,
          error: bnbResult.error instanceof Error ? `BNB gas balance could not be verified: ${bnbResult.error.message}` : 'BNB gas balance could not be verified'
        };
      }

      const bnbBalance = bnbResult.balance;
      return {
        checked: true,
        usdtBalance,
        bnbBalance,
        hasEnoughUsdt: usdtBalance >= amountUsd,
        hasGas: bnbBalance > 0
      };
    } catch (error) {
      return {
        checked: false,
        error: error instanceof Error ? error.message : 'Wallet readiness check failed'
      };
    }
  }
}

export const walletService = new WalletService();
