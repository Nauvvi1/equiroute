# Developer Experience Notes — keep this factual

This file is a working log for the mandatory DX report. Do not submit generic/AI-written filler. Replace blanks with your own measured values from live runs.

## Observed during this build

### Authentication / signing
- Critical detail: the signed `requestPath` must include `/build`. Omitting it causes invalid-signature errors according to the official docs.
- The app keeps signing server-side and never exposes Secret Key to browser code.

### RWA market-state inconsistency
- In a live NVDA test, one representation returned a usable `regular` market state while another surfaced `unknown` from the token-list data.
- Fix implemented: query `RWA Underlying Market Data` and use it to hydrate/fallback the status/reference data before policy evaluation.
- Report whether this removes `unknown` in your final live test: __________

### Displayed vs executable price
- Live NVDA test observed a route whose displayed token/reference gap was about `+0.17%` while executable premium was about `+1.32%` for the tested size.
- This became the central product insight: displayed token price is not enough for pre-trade safety.
- Re-run before submission and record current examples instead of presenting one old quote as permanent market behavior.

### RFQ / transaction simulation
- RWA routes can be RFQ/EIP-712, so treating them as a plain swap would be misleading.
- EquiRoute dry-runs the required ERC-20 approval via Transaction API and does not pretend that this is the full RFQ execution.

### Wallet API
- Added public-address preflight: Binance Wallet API verifies USDT funding, while native BNB gas is verified with BSC `eth_getBalance` so gas readiness is not inferred from a paginated token list.
- Record final observed latency and any edge cases here: __________

### Liquidity / order-size sensitivity
- EquiRoute now has an optional 5× quote-only stress probe. It re-quotes each representation at a larger size without approval simulation/broadcast.
- Record actual live results instead of assuming larger size is worse:
  - ticker / base size: __________
  - provider A base → 5× premium: __________
  - provider B base → 5× premium: __________
  - any quote that disappeared at larger size: __________

### Reliability
- API client retries once on transient HTTP 429/503 (or corresponding business codes) with a newly signed request.
- API trace records module/operation/latency/success for each analysis without logging credentials or query details.

## Final-run measurements

Use the UI “Live API trace” panel.

| Scenario | RWA | Wallet | Trading | Transaction | Notes |
|---|---:|---:|---:|---:|---|
| NVDA $100 | | | | | |
| NVDA $500 | | | | | |
| AAPL $500 | | | | | |
| TSLA $500 | | | | | |

## AI stack feedback

The repo includes an `equiroute-guard` Wallet Skill-compatible policy layer that delegates only after EquiRoute checks execution quality. It also includes a read-only `agentic-quote` path that can call the official `baw market-order quote` after the guard passes. Actual Binance Agentic Wallet sign-in/execution requires the user's own eligible wallet/account setup. If you do not test the official CLI or live execution end-to-end, say so clearly rather than pretending it worked.

What worked: __________
What did not / could not be tested: __________
What is missing: a first-class way for custom Wallet Skills to attach mandatory pre-trade policy hooks to stock execution without re-implementing handoff logic (edit if your final testing shows otherwise).

## Suggested platform improvements

Only keep suggestions you can defend from your own build:

1. Return a normalized execution-quality object (reference value, effective fill, all-in premium) directly from RWA Trading quote responses.
2. Make market-state freshness consistent across token list and underlying-market endpoints.
3. Provide an official policy-hook interface so custom Wallet Skills can register “must-pass-before-trade” checks.
4. Surface request IDs and endpoint latency in development mode to make DX debugging easier.

## Collect the final numbers automatically

With the live app running, set only a public BSC address and run:

```powershell
$env:BENCHMARK_WALLET="0x..."
pnpm dx:benchmark > dx-final.json
```

This performs read/quote/simulation analyses for the table scenarios (including one 5× stress probe) and writes the actual telemetry/results to `dx-final.json`. Review the file and manually transfer only facts you personally verified into the official DX report. Do not submit the JSON blindly as prose.
