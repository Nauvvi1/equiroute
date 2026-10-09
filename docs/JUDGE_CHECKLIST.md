# Judge checklist

- [ ] Public GitHub repo opens without login.
- [ ] `.env` is not committed.
- [ ] Deployed URL stays available through judging.
- [ ] `/api/health` returns `ok: true`.
- [ ] Live NVDA check returns at least one executable route.
- [ ] Route table visibly compares displayed gap vs executable premium vs hidden gap.
- [ ] 5× liquidity stress probe is shown on at least one live scenario and its result is recorded in the DX report.
- [ ] Wallet preflight is visible.
- [ ] Transaction dry-run result is visible when available.
- [ ] API trace shows RWA / Wallet / Trading / Transaction modules.
- [ ] `skills/equiroute-guard/SKILL.md` is present and `analyze` CLI works against deployed/local URL.
- [ ] If Agentic Wallet is available, `agentic-quote` shows EquiRoute → official `baw` read-only quote handoff; do not fake this if unavailable.
- [ ] Demo video is ≤ 4 minutes and uses small/no real value as appropriate.
- [ ] DX report contains measured latencies, exact errors/edge cases and honest AI-stack status.
- [ ] README makes clear what is actually implemented vs what requires external Agentic Wallet setup.

## Score mapping

- **Technical (30%)**: 4 live API modules, HMAC signing, market-state hydration, wallet preflight, RFQ execution math, transaction dry-run, retries, telemetry, stress probe.
- **Originality (25%)**: policy firewall focuses on the hidden gap between displayed token tracking and wallet-specific executable reality, not another price monitor/router.
- **DX report (25%)**: `DX_NOTES.md` collects exact live observations/latencies and unresolved edges; replace blanks with measured facts.
- **Product/UX (20%)**: public-address-only wallet connect, one user rule, dollar route advantage, plain ALLOW/CAUTION/BLOCK, no crypto secrets.
