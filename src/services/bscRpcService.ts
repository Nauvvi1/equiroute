import { env } from '../config/env.js';
import { recordTrace } from '../lib/telemetry.js';

export function weiHexToBnb(value: string): number {
  if (!/^0x[0-9a-f]+$/i.test(value)) throw new Error('Invalid eth_getBalance result');
  const wei = BigInt(value);
  const whole = wei / 1_000_000_000_000_000_000n;
  const fraction = wei % 1_000_000_000_000_000_000n;
  return Number(`${whole}.${fraction.toString().padStart(18, '0')}`);
}

export class BscRpcService {
  async nativeBnbBalance(address: string): Promise<number> {
    const started = performance.now();
    try {
      const response = await fetch(env.bscRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        }),
        signal: AbortSignal.timeout(8_000)
      });

      if (!response.ok) throw new Error(`BSC RPC HTTP ${response.status}`);
      const payload = await response.json() as { result?: string; error?: { message?: string } };
      if (payload.error) throw new Error(payload.error.message || 'BSC RPC returned an error');
      if (!payload.result) throw new Error('BSC RPC returned no native balance');

      const balance = weiHexToBnb(payload.result);
      recordTrace({
        module: 'Other',
        operation: 'BSC native BNB balance',
        method: 'POST',
        durationMs: Math.round(performance.now() - started),
        success: true,
        status: response.status,
        attempt: 1
      });
      return balance;
    } catch (error) {
      recordTrace({
        module: 'Other',
        operation: 'BSC native BNB balance',
        method: 'POST',
        durationMs: Math.round(performance.now() - started),
        success: false,
        attempt: 1
      });
      throw error;
    }
  }
}

export const bscRpcService = new BscRpcService();
