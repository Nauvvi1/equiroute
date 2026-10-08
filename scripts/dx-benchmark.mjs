#!/usr/bin/env node
const baseUrl = String(process.env.EQUIROUTE_URL || 'http://localhost:3000').replace(/\/$/, '');
const walletAddress = String(process.env.BENCHMARK_WALLET || '').trim();
if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
  console.error('Set BENCHMARK_WALLET to a public BSC 0x address. This script never asks for a private key.');
  process.exit(2);
}

const scenarios = [
  { symbol: 'NVDA', amountUsd: 100, maxPremiumPercent: 1, deepScan: false },
  { symbol: 'NVDA', amountUsd: 500, maxPremiumPercent: 1, deepScan: true },
  { symbol: 'AAPL', amountUsd: 500, maxPremiumPercent: 1, deepScan: false },
  { symbol: 'TSLA', amountUsd: 500, maxPremiumPercent: 1, deepScan: false }
];

const results = [];
for (const scenario of scenarios) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...scenario, walletAddress })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    results.push({
      scenario,
      durationMs: Date.now() - started,
      mode: data.mode,
      verdict: data.verdict,
      best: data.bestCandidate ? {
        provider: data.bestCandidate.providerName,
        token: data.bestCandidate.tokenSymbol,
        displayedGapPercent: data.bestCandidate.onChainDeviationPercent,
        executablePremiumPercent: data.bestCandidate.allInPremiumPercent,
        hiddenGapPercent: data.bestCandidate.executionSurprisePercent,
        marketStatus: data.bestCandidate.marketStatus
      } : null,
      routeSavingsUsd: data.routeSavingsUsd,
      liquidityStress: data.liquidityStress,
      telemetry: data.telemetry
    });
  } catch (error) {
    results.push({ scenario, durationMs: Date.now() - started, error: error instanceof Error ? error.message : String(error) });
  }
  await new Promise((resolve) => setTimeout(resolve, 900));
}

process.stdout.write(JSON.stringify({ generatedAt: new Date().toISOString(), baseUrl, results }, null, 2));
