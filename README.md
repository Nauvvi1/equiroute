# EquiRoute

> **Execution firewall for tokenized stocks on BNB Smart Chain.**  
> **Same stock. Different routes. Real execution costs.**

## Links

- **Live:** https://equiroute-hazel.vercel.app/
- **Demo video:** https://youtu.be/W4FK4UdFw_k

## What is EquiRoute?

EquiRoute checks a tokenized-stock trade **before execution**.

A token can look close to the underlying stock price while the quote a user can actually execute is much worse. EquiRoute compares the displayed price with the **live executable route**, exposes the hidden execution premium and returns a clear policy result:

**ALLOW / CAUTION / BLOCK**

It is built as a real pre-trade safety layer, not just a price dashboard.

For the same trade EquiRoute can:

- discover available tokenized-stock representations on BSC;
- fetch live executable quotes through Binance Web3;
- compare execution premium and hidden price gaps;
- detect the best route;
- run a **5× liquidity stress probe**;
- verify USDT funding and native BNB for gas;
- simulate required ERC-20 approval without broadcasting;
- expose a live API trace;
- prepare a policy-gated Agentic Wallet handoff.

The core rule is simple:

> **Never execute blind.**

EquiRoute is especially useful for agentic execution: an AI agent should not act only on a headline token price. It should first prove that the route is executable, funded and inside the user's premium limit.

## Binance Web3 integration

EquiRoute uses:

- **RWA Data API** — tokenized-stock data, reference prices and market state;
- **Trading API** — live executable routes;
- **Wallet API** — USDT funding check;
- **Transaction API** — approval dry-run;
- **Agentic Wallet / Wallet Skills** — guarded execution handoff.

Native BNB is checked directly through BSC RPC.

No seed phrase or private key is requested.  
The web app does not sign or broadcast trades.

## Run locally

### npm

```bash
npm install
npm run dev
```

### pnpm

```bash
pnpm install
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Live mode

Copy `.env.example` to `.env` and add Binance Web3 credentials:

```env
DEMO_MODE=false
BINANCE_WEB3_API_KEY=your_api_key
BINANCE_WEB3_SECRET_KEY=your_secret_key
```

Never commit `.env`.

Without live credentials, `DEMO_MODE=auto` can use clearly labelled demo data.

## Safety

- no private keys;
- no seed phrases;
- no automatic signing;
- no transaction broadcast from the web app;
- missing or unverifiable execution data fails closed;
- `BLOCK` is a hard stop;
- `ALLOW` still requires explicit user confirmation.

---

**EquiRoute turns tokenized-stock execution from a guess into a verified pre-trade decision.**
