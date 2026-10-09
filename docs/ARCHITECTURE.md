# Architecture

```text
Browser
  │ ticker + USDT amount + max premium + public BSC address
  ▼
Express /api/analyze
  ├── RWA Data API
  │     ├── token representations
  │     ├── fresh token/reference price
  │     └── underlying market state
  ├── Wallet API
  │     └── public-address USDT readiness + native BNB gas verification
  ├── Trading API
  │     ├── wallet-specific USDT → tokenized equity RFQ quote
  │     └── vendor-specific approval calldata
  ├── Transaction API
  │     └── approval dry-run, no broadcast
  └── EquiRoute policy engine
        ├── displayed token/reference gap
        ├── executable premium
        ├── hidden execution gap
        ├── optional 5× liquidity stress quote
        └── ALLOW / CAUTION / BLOCK
               │
               ▼
      equiroute-guard Wallet Skill
               │
       BLOCK ───┴── hard stop
               │
      ALLOW / CAUTION
               ▼
      official Binance Agentic Wallet
      read-only quote → explicit confirmation → execution
```

## Why the calculation is different from a price monitor

For a quote, EquiRoute converts the actual returned token amount into underlying-share exposure:

```text
tokensOut = quote.toTokenAmount / 10^decimals
underlyingShares = tokensOut × tokenToShareRatio
referenceExposure = underlyingShares × referencePrice
allInCost = USDT input value + estimated route network fee in USD
executionPremium% = (allInCost / referenceExposure - 1) × 100
hiddenGap% = executionPremium% - displayedTokenVsReferenceGap%
```

The key product insight is `hiddenGap%`: a representation can visually track the reference while the executable quote for a specific order size is materially worse.

## Fail-closed behavior

- no executable quote → BLOCK;
- paused/halted underlying → BLOCK;
- premium over user rule → BLOCK;
- wallet lacks USDT or BNB → BLOCK;
- price policy passes but market is off-hours or transaction simulation is unavailable → CAUTION;
- clean quote + funded wallet + open market + successful preparation simulation → ALLOW.

No verdict is investment advice. It is an execution-quality policy result.
