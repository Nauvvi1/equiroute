# EquiRoute

Intelligent execution router for tokenized stocks on BNB Smart Chain.

## Idea

A user selects an equity such as `NVDA`. EquiRoute is intended to compare available tokenized representations, evaluate on-chain price versus reference price, liquidity and estimated execution quality, then prepare the most suitable route and simulate it before execution.

The MVP is being built for **BNB Hack: Tokenized Stocks Edition**.

## Stack

- Node.js 20+
- TypeScript
- Express
- EJS
- Plain CSS / browser JavaScript

## Local start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Windows PowerShell:

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

Open:

```text
http://localhost:3000
```

Health check:

```text
GET /api/health
```

## Environment

```env
PORT=3000
NODE_ENV=development
BINANCE_WEB3_API_KEY=
BINANCE_WEB3_SECRET_KEY=
BINANCE_WEB3_BASE_URL=
```

Never commit real API keys or secret keys.

## Current state

This archive intentionally contains the clean project shell only. No Binance endpoint or authentication scheme is guessed or hard-coded before checking the official API documentation for the exact services used by the hackathon.

Next development step: wire the first real Binance Web3 endpoint and verify the API key with live data.
