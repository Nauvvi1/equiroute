import 'dotenv/config';

function getEnv(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  port: Number(getEnv('PORT', '3000')),
  nodeEnv: getEnv('NODE_ENV', 'development'),
  binanceApiKey: getEnv('BINANCE_WEB3_API_KEY'),
  binanceSecretKey: getEnv('BINANCE_WEB3_SECRET_KEY'),
  binanceBaseUrl: getEnv('BINANCE_WEB3_BASE_URL')
};

export function getApiConfigStatus() {
  return {
    apiKeyConfigured: Boolean(env.binanceApiKey),
    secretKeyConfigured: Boolean(env.binanceSecretKey),
    baseUrlConfigured: Boolean(env.binanceBaseUrl)
  };
}
