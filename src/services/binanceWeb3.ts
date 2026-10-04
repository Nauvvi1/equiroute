import { env, getApiConfigStatus } from '../config/env.js';

export class BinanceWeb3Service {
  getStatus() {
    return getApiConfigStatus();
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!env.binanceBaseUrl) {
      throw new Error('BINANCE_WEB3_BASE_URL is not configured');
    }

    if (!env.binanceApiKey) {
      throw new Error('BINANCE_WEB3_API_KEY is not configured');
    }

    const url = new URL(path, env.binanceBaseUrl);

    /*
      ВАЖНО:
      Конкретную схему авторизации/подписи подставим после проверки
      официальной документации нужного Binance Web3 API endpoint.
      Здесь намеренно нет выдуманных заголовков и подписи.
    */
    const response = await fetch(url, init);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Binance Web3 API error ${response.status}: ${body}`);
    }

    return response.json() as Promise<T>;
  }
}

export const binanceWeb3Service = new BinanceWeb3Service();
