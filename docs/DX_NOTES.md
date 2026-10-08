# Developer Experience notes — fill during development

Do not turn this into generic AI-written feedback. Record exact observations while working.

## Onboarding

- Time from opening docs to first successful signed request:
- First successful endpoint:
- Errors encountered:

## Authentication

- `/build` prefix in signed requestPath:
- Timestamp / recv window issues:
- Error codes and what fixed them:

## RWA Data API

- Which providers are returned for the same ticker on BSC?
- Does the token list/search match expectations?
- How useful are `referencePrice`, `tokenToShareRatio`, market status and next-open time?
- Behavior outside traditional market hours:

## Trading API

- RFQ vendors returned for Ondo / bStock:
- Quote latency:
- Quote TTL behavior:
- Price impact and fee fields:
- Any route failures or confusing messages:

## Transaction API

- Approval simulation result:
- Can an RFQ order itself be simulated before EIP-712 signing?
- Any mismatch between docs and response shape:

## Wallet Skills / Agentic Wallet

- Installation experience:
- How policy constraints can be represented:
- What requires explicit confirmation:
- What is missing for a clean “execution guard” flow:

## Requested capabilities

- A single endpoint returning RWA reference + executable RFQ quote + normalized underlying-share exposure would simplify this product.
- Consider a native pre-sign RFQ simulation/risk endpoint so agents can verify the final order before asking the wallet to sign.
