import { binanceClient } from '../lib/binanceClient.js';
import { env } from '../config/env.js';
import type { RwaToken } from '../types/binance.js';

let cache: { at: number; tokens: RwaToken[] } | null = null;
const CACHE_MS = 20_000;

export class RwaService {
  async listBscTokens(): Promise<RwaToken[]> {
    if (cache && Date.now() - cache.at < CACHE_MS) {
      return cache.tokens;
    }

    const tokens = await binanceClient.get<RwaToken[]>('/api/v1/dex/market/rwa/tokens', {
      binanceChainId: env.bscChainId
    });

    cache = { at: Date.now(), tokens };
    return tokens;
  }

  async findByTicker(symbol: string): Promise<RwaToken[]> {
    const normalized = symbol.trim().toUpperCase();
    const tokens = await this.listBscTokens();
    return tokens.filter((token) => token.underlyingTicker?.toUpperCase() === normalized);
  }
}

export const rwaService = new RwaService();
