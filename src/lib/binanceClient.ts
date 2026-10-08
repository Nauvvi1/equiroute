import crypto from 'node:crypto';
import { env } from '../config/env.js';
import { moduleForPath, operationForPath, recordTrace } from './telemetry.js';
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BinanceWeb3Client {
  async request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}): Promise<T> {
    if (!env.binanceApiKey || !env.binanceSecretKey) {
      throw new BinanceApiError('Binance Web3 API credentials are not configured');
    }

    const query = encodeQuery(options.query);
    const fullPath = query ? `${path}?${query}` : path;
    const requestPath = `/build${fullPath}`;
    const body = method === 'GET' || options.body === undefined ? '' : JSON.stringify(options.body);

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const started = performance.now();
      const timestamp = new Date().toISOString();
      const signature = createSignature({
        timestamp,
        method,
        requestPath,
        body,
        secretKey: env.binanceSecretKey
      });

      try {
        const response = await fetch(`${env.binanceBaseUrl}${fullPath}`, {
          method,
          headers: {
            'X-OC-APIKEY': env.binanceApiKey,
            'X-OC-TIMESTAMP': timestamp,
            'X-OC-SIGN': signature,
            'X-OC-RECV-WINDOW': String(env.recvWindow),
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
          recordTrace({
            module: moduleForPath(path), operation: operationForPath(path), method,
            durationMs: Math.round(performance.now() - started), success: false,
            status: response.status, attempt
          });
          throw new BinanceApiError(`Binance Web3 API returned non-JSON response (${response.status})`, response.status);
        }

        const retryable = response.status === 429 || response.status === 503 || payload?.code === 42900 || payload?.code === 50001;
        if ((!response.ok || !payload || payload.code !== 0 || payload.success === false) && retryable && attempt === 1) {
          recordTrace({
            module: moduleForPath(path), operation: operationForPath(path), method,
            durationMs: Math.round(performance.now() - started), success: false,
            status: response.status, code: payload?.code, attempt
          });
          const retryAfter = Number(response.headers.get('retry-after'));
          await sleep(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 2000) : 300);
          continue;
        }

        if (!response.ok) {
          recordTrace({
            module: moduleForPath(path), operation: operationForPath(path), method,
            durationMs: Math.round(performance.now() - started), success: false,
            status: response.status, code: payload?.code, attempt
          });
          throw new BinanceApiError(payload?.msg || `Binance Web3 API HTTP ${response.status}`, response.status, payload?.code);
        }

        if (!payload || payload.code !== 0 || payload.success === false) {
          recordTrace({
            module: moduleForPath(path), operation: operationForPath(path), method,
            durationMs: Math.round(performance.now() - started), success: false,
            status: response.status, code: payload?.code, attempt
          });
          throw new BinanceApiError(payload?.msg || 'Binance Web3 API request failed', response.status, payload?.code);
        }

        recordTrace({
          module: moduleForPath(path), operation: operationForPath(path), method,
          durationMs: Math.round(performance.now() - started), success: true,
          status: response.status, code: payload.code, attempt
        });
        return payload.data;
      } catch (error) {
        if (error instanceof BinanceApiError) throw error;
        recordTrace({
          module: moduleForPath(path), operation: operationForPath(path), method,
          durationMs: Math.round(performance.now() - started), success: false, attempt
        });
        if (attempt === 1 && error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
          await sleep(200);
          continue;
        }
        throw new BinanceApiError(error instanceof Error ? error.message : 'Binance Web3 API request failed');
      }
    }

    throw new BinanceApiError('Binance Web3 API request failed after retry');
  }

  get<T>(path: string, query?: Record<string, QueryValue>): Promise<T> {
    return this.request<T>('GET', path, { query });
  }

  post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, { body });
  }
}

export const binanceClient = new BinanceWeb3Client();
