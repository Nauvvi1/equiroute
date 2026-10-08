import 'dotenv/config';

function value(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

const demoModeRaw = value('DEMO_MODE', 'auto').toLowerCase();

export const env = {
  port: Number(value('PORT', '3000')),
  nodeEnv: value('NODE_ENV', 'development'),
  demoMode: demoModeRaw,
  binanceApiKey: value('BINANCE_WEB3_API_KEY'),
  binanceSecretKey: value('BINANCE_WEB3_SECRET_KEY'),
  binanceBaseUrl: value('BINANCE_WEB3_BASE_URL', 'https://web3.binance.com/build').replace(/\/$/, ''),
  bscChainId: value('BSC_CHAIN_ID', '56'),
  bscUsdtAddress: value('BSC_USDT_ADDRESS', '0x55d398326f99059fF775485246999027B3197955'),
  bscUsdtDecimals: Number(value('BSC_USDT_DECIMALS', '18'))
};

export function credentialsConfigured(): boolean {
  return Boolean(env.binanceApiKey && env.binanceSecretKey);
}

export function isDemoMode(): boolean {
  if (env.demoMode === 'true') return true;
  if (env.demoMode === 'false') return false;
  return !credentialsConfigured();
}

export function apiStatus() {
  return {
    mode: isDemoMode() ? 'demo' : 'live',
    credentialsConfigured: credentialsConfigured(),
    baseUrl: env.binanceBaseUrl,
    chainId: env.bscChainId
  };
}
