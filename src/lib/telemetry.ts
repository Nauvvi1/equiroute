import { AsyncLocalStorage } from 'node:async_hooks';
import type { ApiTrace } from '../types/analysis.js';

const storage = new AsyncLocalStorage<ApiTrace[]>();

export async function runWithTelemetry<T>(fn: () => Promise<T>): Promise<{ value: T; telemetry: ApiTrace[] }> {
  const trace: ApiTrace[] = [];
  const value = await storage.run(trace, fn);
  return { value, telemetry: trace };
}

export function recordTrace(entry: ApiTrace): void {
  storage.getStore()?.push(entry);
}

export function moduleForPath(path: string): ApiTrace['module'] {
  if (path.includes('/market/rwa/')) return 'RWA';
  if (path.includes('/aggregator/')) return 'Trading';
  if (path.includes('/pre-transaction/')) return 'Transaction';
  if (path.includes('/balance/')) return 'Wallet';
  if (path.includes('/market/')) return 'Market';
  return 'Other';
}

export function operationForPath(path: string): string {
  const last = path.split('/').filter(Boolean).at(-1) || path;
  return last.replaceAll('-', ' ');
}
