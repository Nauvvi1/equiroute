# EquiRoute

**Execution Guard for Tokenized Stocks on BNB Smart Chain**

EquiRoute answers a simple question **before** a user trades a tokenized stock:

> “If I spend $500 on NVDA exposure right now, what will I actually receive — and is the real execution worse than my limit?”

Tokenized equities can keep trading while the underlying market is closed. A displayed token price is not the same thing as an executable fill: routing, RFQ pricing, price impact, network cost and thin liquidity can make the actual exposure materially worse.

EquiRoute turns that into a user-defined safety rule:

> **Never execute when the best verified all-in premium is more than 1% above the Binance RWA reference exposure.**

The current MVP **does not sign or broadcast trades**. It is intentionally a pre-trade guard.

## What it does

1. Loads BSC tokenized-stock representations from the **Binance Web3 RWA Data API**.
2. Reads token price, Binance RWA reference price, token-to-share ratio and traditional-market status.
3. Requests an executable **USDT → tokenized stock** route from the **Trading API**.
4. Converts the quote output back into equivalent underlying-share exposure.
5. Computes an all-in execution premium and estimated avoidable cost in USD.
6. Applies the user's limit and returns **ALLOW / CAUTION / BLOCK**.
7. Builds the required ERC-20 approval for the chosen RFQ vendor and dry-runs it with the **Transaction API**.
8. Never asks for a seed phrase/private key and never broadcasts a transaction.

## Why this is different from a price monitor

A price monitor says “the token is $X”. EquiRoute asks “for my actual order size, how much stock exposure would this executable route deliver?”.

That distinction becomes important during off-hours and when liquidity is fragmented across tokenized representations.

## Stack

- Node.js 20+
- TypeScript
- Express
- EJS
- Browser JavaScript / CSS
- Binance Web3 RWA Data API
- Binance Web3 Trading API
- Binance Web3 Transaction API
- BNB Smart Chain mainnet

## Run locally

```bash
npm install
cp .env.example .env
npm run dev
```

PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open `http://localhost:3000`.

### pnpm

If you use pnpm:

```powershell
pnpm install
Copy-Item .env.example .env
pnpm dev
```

## Demo mode

With no API credentials, `DEMO_MODE=auto` starts the app with clearly labelled illustrative data. This is useful for UI development.

For live mode, add fresh credentials from the Binance Web3 Developer Portal:

```env
DEMO_MODE=false
BINANCE_WEB3_API_KEY=your_api_key
BINANCE_WEB3_SECRET_KEY=your_secret_key
```

Do **not** commit `.env`.

For live RWA/RFQ quotes, enter a public BSC wallet address in the UI. A public address is used as the RFQ receiver/sender context; EquiRoute never needs the wallet's secret.

## API authentication

The implementation follows the current Binance Web3 API signing format:

```text
preHash = timestamp + METHOD + /build/request/path?query + rawBody
signature = Base64(HMAC-SHA256(preHash, secretKey))
```

Required request headers are generated server-side. Secrets are never exposed to browser JavaScript.

## Safety behavior

EquiRoute fails closed:

- no executable quote → **BLOCK**;
- execution premium exceeds the user's threshold → **BLOCK**;
- route is inside the threshold but the traditional market is closed → **CAUTION**;
- verified route is inside the threshold while the market is open → **ALLOW**.

The Binance RWA `referencePrice` is presented as **Binance's RWA API reference value**, not as an official exchange order-book quote.

## RFQ / simulation detail

Binance Web3 documentation states that equity/RWA routes use `RFQ` execution. These routes require EIP-712 signing for the actual order. This MVP therefore does not pretend to simulate or broadcast the RFQ itself.

Instead, when a live RFQ quote is available, EquiRoute:

1. asks the Trading API for the vendor-specific ERC-20 approval calldata;
2. constructs the approval transaction locally;
3. sends it to the Transaction API `/pre-transaction/simulate` endpoint;
4. displays the predicted result;
5. does **not** broadcast anything.

This is also a useful DX finding for the hackathon report.

## Scripts

```bash
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

## Project status

This archive is a working MVP for the **execution-guard** direction. The next high-value addition is Agentic Wallet / Wallet Skills: store the user's rule (for example, max 1% execution premium) and let an agent refuse execution automatically when the rule fails.

## Disclaimer

EquiRoute is a hackathon prototype for execution-quality analysis. It does not provide investment advice and does not promise a trading outcome or profit.
