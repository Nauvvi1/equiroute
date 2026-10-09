# Submission copy pack

Use this as a starting point; replace URLs before submitting.

## Project name

EquiRoute

## One-line description

A pre-trade execution firewall that reveals the hidden gap between a tokenized stock's displayed price and the wallet-specific executable quote, then gates human/AI execution with an explicit policy.

## Short project description

EquiRoute protects tokenized-stock users from invisible execution drag. For a ticker and order size, it compares bStocks/Ondo representations, refreshes Binance RWA reference and market state, checks public-wallet USDT/BNB readiness, requests a live executable Trading API route, translates quote output back into underlying-share exposure, and exposes the “hidden execution gap” between displayed and actually executable pricing. A user-defined premium policy returns ALLOW / CAUTION / BLOCK. Transaction API dry-runs the required approval. An optional 5× quote-only stress probe exposes order-size sensitivity. The included Wallet Skill places this guard in front of Binance Agentic Wallet execution, can prove a read-only handoff through the official `baw` CLI, and requires explicit user confirmation before any state-changing action.

## Binance Web3 API modules

RWA Data API, Trading API, Transaction API, Wallet API; plus Agentic Wallet / Wallet Skills integration.

## Tokenized stocks

bStocks and Ondo are compared when returned for the requested BSC ticker. The app only claims support for representations actually returned by the Binance RWA Data API at runtime.

## Tracks / special prize

- Main track: Tokenized Stocks Products & Agents
- Best Use of Agentic Wallet / Wallet Skills: applicable because repo includes a custom policy skill and explicit Agentic Wallet handoff. Be honest in DX report about whether final live Agentic Wallet execution was tested.

## Repository

`https://github.com/<USER>/equiroute`

## Deployed URL

`https://<YOUR-DEPLOYMENT>`

## Demo video

`https://<YOUR-VIDEO>`

## What judges should try

NVDA / 500 USDT / 1.0% max premium / public funded BSC address. Compare the displayed gap with executable premium and hidden gap, enable the 5× liquidity stress probe, then inspect wallet readiness, transaction dry-run, live API trace and Agentic handoff.
