import { binanceClient } from '../lib/binanceClient.js';
import { env } from '../config/env.js';
import type { MarketStatus, RwaPrice, RwaToken, RwaUnderlyingMarket } from '../types/binance.js';

let cache: { at: number; tokens: RwaToken[] } | null = null;
const CACHE_MS = 20_000;

type LooseMarketStatus = Partial<MarketStatus> & {
  status?: string | null;
};

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text ? text : null;
}

function inferMarketStatus(raw: LooseMarketStatus | undefined): string {
  const explicit = cleanText(raw?.marketStatus) || cleanText(raw?.status);
  const hint = [explicit, cleanText(raw?.reasonCode), cleanText(raw?.reasonMsg)]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/pre[\s_-]?market/.test(hint)) return 'premarket';
  if (/post[\s_-]?market/.test(hint)) return 'postmarket';
  if (/overnight/.test(hint)) return 'overnight';
  if (/pause|transition/.test(hint)) return 'pause';
  if (/halt|suspend/.test(hint)) return 'halted';
  if (/closed|holiday|weekend/.test(hint)) return 'closed';
  if (/trading|regular|open/.test(hint)) return 'regular';

  // Some bStocks responses expose openState=true + reason "TRADING" but omit marketStatus.
  // openState is authoritative enough for the UI/guard even when the textual label is absent.
  if (raw?.openState === true) return 'regular';
  if (raw?.openState === false) return 'closed';
  return 'unknown';
}

function inferOpenState(raw: LooseMarketStatus | undefined, marketStatus: string): boolean {
  if (typeof raw?.openState === 'boolean') return raw.openState;
  return ['premarket', 'regular', 'postmarket', 'overnight'].includes(marketStatus.toLowerCase());
}

export function normalizeMarketStatus(raw: LooseMarketStatus | undefined): MarketStatus {
  const marketStatus = inferMarketStatus(raw);
  return {
    openState: inferOpenState(raw, marketStatus),
    marketStatus,
    reasonCode: cleanText(raw?.reasonCode),
    reasonMsg: cleanText(raw?.reasonMsg),
    nextOpenTime: typeof raw?.nextOpenTime === 'number' ? raw.nextOpenTime : null,
    nextCloseTime: typeof raw?.nextCloseTime === 'number' ? raw.nextCloseTime : null
  };
}

function mergeDefined<T extends Record<string, unknown>>(base: T, override: Record<string, unknown> | undefined): T {
  if (!override) return base;
  const merged = { ...base } as Record<string, unknown>;
  for (const [key, value] of Object.entries(override)) {
    if (value !== undefined && value !== null && value !== '') merged[key] = value;
  }
  return merged as T;
}

function extractRemoteStatus(market: RwaUnderlyingMarket): LooseMarketStatus | undefined {
  const loose = market as unknown as Record<string, unknown>;
  const marketData = loose.marketData && typeof loose.marketData === 'object'
    ? loose.marketData as Record<string, unknown>
    : undefined;

  const nested = loose.statusInfo && typeof loose.statusInfo === 'object'
    ? loose.statusInfo as LooseMarketStatus
    : marketData?.statusInfo && typeof marketData.statusInfo === 'object'
      ? marketData.statusInfo as LooseMarketStatus
      : undefined;

  if (nested) return nested;

  // Defensive support for providers that flatten status fields in live responses.
  return {
    openState: typeof loose.openState === 'boolean' ? loose.openState : undefined,
    marketStatus: cleanText(loose.marketStatus) || undefined,
    status: cleanText(loose.status) || undefined,
    reasonCode: cleanText(loose.reasonCode),
    reasonMsg: cleanText(loose.reasonMsg),
    nextOpenTime: typeof loose.nextOpenTime === 'number' ? loose.nextOpenTime : undefined,
    nextCloseTime: typeof loose.nextCloseTime === 'number' ? loose.nextCloseTime : undefined
  };
}

export class RwaService {
  async listBscTokens(): Promise<RwaToken[]> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.tokens;

    const tokens = await binanceClient.get<RwaToken[]>('/api/v1/dex/market/rwa/tokens', {
      binanceChainId: env.bscChainId
    });
    const normalized = tokens.map((token) => ({
      ...token,
      statusInfo: normalizeMarketStatus(token.statusInfo)
    }));
    cache = { at: Date.now(), tokens: normalized };
    return normalized;
  }

  async refreshPrices(tokens: RwaToken[]): Promise<RwaToken[]> {
    if (!tokens.length) return [];
    const prices = await binanceClient.get<RwaPrice[]>('/api/v1/dex/market/rwa/price', {
      binanceChainId: env.bscChainId,
      tokenContractAddresses: tokens.map((token) => token.tokenContractAddress).join(',')
    });
    const byAddress = new Map(prices.map((price) => [price.tokenContractAddress.toLowerCase(), price]));
    return tokens.map((token) => {
      const price = byAddress.get(token.tokenContractAddress.toLowerCase());
      return price ? {
        ...token,
        tokenPrice: price.tokenPrice || token.tokenPrice,
        referencePrice: price.referencePrice || token.referencePrice,
        tokenPriceUpdatedAt: price.tokenPriceUpdatedAt ?? token.tokenPriceUpdatedAt ?? null
      } : token;
    });
  }

  async hydrateMarket(token: RwaToken): Promise<RwaToken> {
    try {
      const market = await binanceClient.get<RwaUnderlyingMarket>('/api/v1/dex/market/rwa/underlying-market', {
        binanceChainId: env.bscChainId,
        tokenContractAddress: token.tokenContractAddress
      });
      const remoteStatus = extractRemoteStatus(market);
      const mergedStatus = mergeDefined(
        token.statusInfo as unknown as Record<string, unknown>,
        remoteStatus as unknown as Record<string, unknown> | undefined
      ) as LooseMarketStatus;

      return {
        ...token,
        statusInfo: normalizeMarketStatus(mergedStatus),
        referencePrice: market.marketData?.referencePrice || token.referencePrice
      };
    } catch {
      // Keep the normalized token-list status if the per-token market endpoint is unavailable.
      return { ...token, statusInfo: normalizeMarketStatus(token.statusInfo) };
    }
  }

  async findByTicker(symbol: string): Promise<RwaToken[]> {
    const normalized = symbol.trim().toUpperCase();
    const tokens = (await this.listBscTokens()).filter((token) => token.underlyingTicker?.toUpperCase() === normalized);
    const refreshed = await this.refreshPrices(tokens);
    const hydrated: RwaToken[] = [];
    // Sequential calls stay below the default 5 RPS endpoint limit.
    for (const token of refreshed) hydrated.push(await this.hydrateMarket(token));
    return hydrated;
  }
}

export const rwaService = new RwaService();
