# EquiRoute

> **A pre-trade execution firewall for tokenized stocks on BNB Smart Chain.**

A tokenized stock can look almost perfectly aligned with its underlying reference price while the **quote a user can actually execute** is materially worse. EquiRoute checks that hidden gap before a human or AI agent trades.

**Example:** the UI can show an Ondo NVDA token only `+0.17%` above reference while the live executable route is `+1.32%`. With a user's `1.00%` policy, EquiRoute returns **BLOCK**.

## Why it exists

Tokenized equities trade on-chain outside traditional market hours, across multiple representations and fragmented liquidity. A displayed token price is not an executable fill. Users can encounter:

- token/reference divergence;
- RFQ / route-specific execution premium;
- slippage and price impact;
- closed/paused underlying market states;
- insufficient wallet funding or gas;
- AI agents that would otherwise execute from a headline price without an independent policy gate.

EquiRoute turns those into a simple rule:

> **Never execute if the best verified live route exceeds my maximum premium.**

## What makes this different

This is not another price monitor or "pick the cheapest provider" dashboard.

EquiRoute measures **three layers** for the same trade:

1. **Underlying reference** — Binance Web3 RWA reference value and market state.
2. **Displayed token gap** — token price vs the ratio-adjusted underlying reference (`referencePrice × tokenToShareRatio`).
3. **Executable reality** — what the wallet-specific Trading API quote actually delivers in equivalent underlying-share exposure.

The difference between (2) and (3) is the **hidden execution gap**. That is the user pain EquiRoute makes visible and enforceable.

## Live pipeline

```text
Ticker + amount + user policy + public BSC wallet
                    │
                    ▼
RWA Data API ── token/reference price + market status
                    │
                    ▼
Wallet API ─── USDT funding
BSC RPC ───── native BNB gas readiness
                    │
                    ▼
Trading API ── wallet-specific executable RFQ/route
                    │
                    ▼
Transaction API ── approval dry-run (no broadcast)
                    │
                    ▼
EquiRoute Policy Engine
          ALLOW / CAUTION / BLOCK
                    │
                    ▼
Wallet Skill → Agentic Wallet (explicit confirmation only)
```

## Binance Web3 modules used

- **RWA Data API** — token list, refreshed token/reference prices, underlying market status.
- **Trading API** — live USDT → tokenized-stock executable routes and approval calldata.
- **Transaction API** — dry-run the required ERC-20 approval before any real funds move.
- **Wallet API** — check the public BSC wallet's USDT funding. Native BNB gas balance is verified separately with BSC `eth_getBalance`, because BNB is the chain's native asset rather than a BEP-20 token.
- **Agentic Wallet / Wallet Skills** — included `equiroute-guard` skill acts as a policy firewall before delegated execution and can prove the handoff with a read-only official `baw market-order quote`.

An optional **5× liquidity stress probe** re-quotes the same representations at a larger order size, exposing execution deterioration that a single headline quote can hide. It is quote-only and never broadcasts.

The app also records a **request-scoped API trace** (module, operation, latency, success/failure) so judges can see the integration actually running and the Developer Experience Report can use measured data rather than vague claims.

## Policy semantics

- No executable quote → **BLOCK**.
- Halted/paused status → **BLOCK**.
- Executable premium above user threshold → **BLOCK**.
- Wallet has insufficient USDT or no BNB for gas → **BLOCK**.
- Price policy passes but the underlying market is closed → **CAUTION**.
- Price policy passes, market is open, wallet is ready and preparation simulation is healthy → **ALLOW**.
- If the approval simulation is unavailable, a clean ALLOW is downgraded to **CAUTION** rather than pretending execution readiness is proven.
- `ALLOW` is still **not permission to auto-trade**. Agentic execution requires explicit user confirmation.

## Run locally

Node.js 20+.

```bash
npm install
npm run dev
```

The app starts in demo mode when live Binance Web3 credentials are not configured. To use live mode, copy `.env.example` to `.env` and add fresh credentials.

Open `http://localhost:3000`.

### pnpm

```powershell
pnpm install
pnpm dev
```

## Demo vs live mode

With no credentials, `DEMO_MODE=auto` shows clearly labelled illustrative data.

For live mode:

```env
DEMO_MODE=false
BINANCE_WEB3_API_KEY=your_fresh_api_key
BINANCE_WEB3_SECRET_KEY=your_fresh_secret_key
```

Never commit `.env`.

For live RFQ analysis, enter only a **public BSC wallet address (`0x...`)** or use the browser `Connect wallet` button, which only reads the public address. EquiRoute does not request or store a seed phrase/private key and cannot sign a transaction.

## Wallet Skill / Agentic Wallet integration

The repo contains:

```text
skills/equiroute-guard/
├── SKILL.md
└── scripts/cli.mjs
```

The skill makes EquiRoute a policy gate in front of the official Binance Agentic Wallet Skill. It never bypasses `BLOCK`, re-checks before execution, uses the exact contract address returned by EquiRoute, and requires explicit confirmation before the wallet acts.

Test the policy layer against a running EquiRoute instance:

```bash
node skills/equiroute-guard/scripts/cli.mjs analyze '{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0xYOUR_PUBLIC_BSC_ADDRESS","deepScan":true}'
```

If the official Binance Agentic Wallet CLI (`baw`) is connected, prove the handoff without trading:

```bash
node skills/equiroute-guard/scripts/cli.mjs agentic-quote '{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0xYOUR_PUBLIC_BSC_ADDRESS"}'
```

`agentic-quote` stops on `BLOCK`, otherwise asks the official Agentic Wallet for a second **read-only** quote on the exact token contract selected by EquiRoute. It never sends a swap.

Actual Agentic Wallet execution requires the user's own eligible Binance/MPC/Agentic Wallet setup. This repository does **not** fake that step when it is unavailable.

## API authentication

Requests follow the Binance Web3 signed format:

```text
preHash = timestamp + METHOD + /build/request/path?query + rawBody
signature = Base64(HMAC-SHA256(preHash, secretKey))
```

Secrets stay server-side. The client retries once on transient rate-limit/service errors with a freshly signed request.

## Safety / security details

- Fail-closed for unverifiable execution quality.
- Browser output escapes API-provided token/provider strings before rendering.
- No private wallet credentials.
- No signing or broadcasting from the web app.
- No investment-return claim or PnL promise.
- RFQ/EIP-712 execution is not misrepresented as a normal swap simulation.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

## Judge quick path

1. Start the app in live mode.
2. Enter `NVDA`, `500`, a `1.0%` threshold and a funded public BSC address.
3. Compare `Displayed gap` vs `Executable premium` vs `Hidden gap`.
4. Inspect route-specific `ALLOW/CAUTION/BLOCK`.
5. Inspect wallet preflight, Transaction API approval dry-run and live API trace.
6. Enable the 5× liquidity stress probe and show whether route quality deteriorates with size.
7. Copy the Agentic handoff or run the included Wallet Skill CLI; if `baw` is configured, use `agentic-quote` to prove the official read-only handoff.

See `docs/ARCHITECTURE.md`, `docs/JUDGE_CHECKLIST.md`, `docs/DEMO_SCRIPT.md`, `docs/DEPLOY.md` and `docs/SUBMISSION.md`.

## Disclaimer

Hackathon prototype for execution-quality analysis and policy enforcement. It does not provide investment advice, guarantee a fill, or promise profit.

### Market-status normalization

Live RWA providers are not perfectly uniform. EquiRoute normalizes Binance RWA market state defensively: if `marketStatus` is omitted but `openState`/reason fields are present (for example bStocks returning `openState=true` with `TRADING`), the UI reports the session as `regular` instead of incorrectly showing `unknown`. The per-token `underlying-market` endpoint remains the preferred source, with the token-list status as fallback.
