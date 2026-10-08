# 3-minute demo outline

1. **Problem (20 sec)**
   “Tokenized stocks trade when the underlying market can be closed. The price you see is not necessarily the execution you get.”

2. **Rule (20 sec)**
   Set: `Never execute if all-in premium > 1%`.

3. **Analyze NVDA (45 sec)**
   Enter `$500`, show representations returned by Binance Web3, token/reference gap, executable RFQ premium and market status.

4. **Guard decision (30 sec)**
   Show ALLOW/CAUTION/BLOCK and the estimated dollar cost that the rule protects against.

5. **Transaction safety (30 sec)**
   Show that EquiRoute builds the vendor-specific USDT approval and dry-runs it through Transaction API without broadcasting.

6. **Architecture (25 sec)**
   RWA Data → Trading quote → exposure normalization → policy → Transaction simulation.

7. **Next step / Agentic Wallet (10 sec)**
   Store the user policy in the execution layer and let the agent refuse trades that violate it.
