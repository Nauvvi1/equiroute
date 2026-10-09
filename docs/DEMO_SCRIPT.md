# Demo video script (≤ 4 minutes)

## 0:00–0:25 — Problem

“Tokenized stocks can look close to the underlying reference price while the route a user can actually execute is materially worse. EquiRoute is a pre-trade firewall that measures that hidden gap before a human or AI agent trades.”

## 0:25–1:20 — Live NVDA check

- Show `LIVE BINANCE WEB3`.
- Enter NVDA, 500 USDT, 1.0%, public BSC wallet.
- Run the firewall.
- Point at two representations.
- Emphasize a case where the displayed gap is small but executable premium breaches the policy.
- Say: “The user would think this route is near reference, but EquiRoute blocks it from the executable quote.”

## 1:20–1:55 — Wallet + transaction safety

Show Wallet preflight: public address, USDT readiness, BNB gas readiness.
Show Transaction dry-run. Explain no seed phrase/private key is used and the web app never broadcasts.

## 1:55–2:35 — Hidden gap + liquidity stress

Show `Hidden execution gap` and `Route advantage` in dollars. Then enable/show the **5× size stress probe** and explain whether the same route degrades at a larger order size. This connects the product directly to fragmented liquidity and slippage instead of only a static price gap.

## 2:35–3:10 — Technical proof

Scroll to the API trace. Name the modules visible in one request:
RWA Data → Wallet → Trading → Transaction.
Mention request signing, rate-limit retry, underlying-market fallback and fail-closed behavior.

## 3:10–3:40 — Agentic Wallet / Wallet Skill

Show `skills/equiroute-guard/SKILL.md` and run `analyze`. If your Agentic Wallet CLI is actually configured, run `agentic-quote` too: it proves EquiRoute selects/gates the exact contract and the official `baw` layer independently quotes it, without trading.
Explain: “This policy layer sits in front of Agentic Wallet. BLOCK can never be bypassed by the agent; CAUTION/ALLOW still require explicit user confirmation, and the exact contract address from EquiRoute is handed off.”

Do not claim a real Agentic Wallet trade if it was not actually tested on your account.

## 3:40–3:58 — Close

“EquiRoute turns an invisible execution-quality problem into a rule that humans and agents can enforce before money moves.”
