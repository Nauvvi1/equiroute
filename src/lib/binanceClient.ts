import crypto from 'node:crypto';
import { env } from '../config/env.js';
import type { BinanceEnvelope } from '../types/binance.js';

export class BinanceApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: number
  ) {
    super(message);
    this.name = 'BinanceApiError';
  }
}

type QueryValue = string | number | boolean | undefined | null;

type RequestOptions = {
  query?: Record<string, QueryValue>;
  body?: unknown;
};

export function encodeQuery(query: Record<string, QueryValue> = {}): string {
  return Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
}

export function createSignature(params: {
  timestamp: string;
  method: string;
  requestPath: string;
  body: string;
  secretKey: string;
}): string {
  const preHash = params.timestamp + params.method.toUpperCase() + params.requestPath + params.body;
  return crypto.createHmac('sha256', params.secretKey).update(preHash, 'utf8').digest('base64');
}

export class BinanceWeb3Client {
  async request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}): Promise<T> {
    if (!env.binanceApiKey || !env.binanceSecretKey) {
      throw new BinanceApiError('Binance Web3 API credentials are not configured');
    }

    const query = encodeQuery(options.query);
    const fullPath = query ? `${path}?${query}` : path;
    const requestPath = `/build${fullPath}`;
    const timestamp = new Date().toISOString();
    const body = method === 'GET' || options.body === undefined ? '' : JSON.stringify(options.body);
    const signature = createSignature({
      timestamp,
      method,
      requestPath,
      body,
      secretKey: env.binanceSecretKey
    });

    const response = await fetch(`${env.binanceBaseUrl}${fullPath}`, {
      method,
      headers: {
        'X-OC-APIKEY': env.binanceApiKey,
        'X-OC-TIMESTAMP': timestamp,
        'X-OC-SIGN': signature,
        ...(body ? { 'Content-Type': 'application/json' } : {})
      },
      body: body || undefined,
      signal: AbortSignal.timeout(12_000)
    });

    const text = await response.text();
    let payload: BinanceEnvelope<T> | null = null;

    try {
      payload = text ? (JSON.parse(text) as BinanceEnvelope<T>) : null;
    } catch {
      throw new BinanceApiError(`Binance Web3 API returned non-JSON response (${response.status})`, response.status);
    }

    if (!response.ok) {
      throw new BinanceApiError(payload?.msg || `Binance Web3 API HTTP ${response.status}`, response.status, payload?.code);
    }

    if (!payload || payload.code !== 0 || payload.success === false) {
      throw new BinanceApiError(payload?.msg || 'Binance Web3 API request failed', response.status, payload?.code);
    }

    return payload.data;
  }

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }
}

export const binanceClient = new BinanceWeb3Client();
