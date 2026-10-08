#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const [command, raw] = process.argv.slice(2);
if (!['analyze', 'agentic-quote'].includes(command)) {
  console.error('Usage:\n  node cli.mjs analyze \'{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0x..."}\'\n  node cli.mjs agentic-quote \'{"symbol":"NVDA","amountUsd":100,"maxPremiumPercent":1,"walletAddress":"0x..."}\'');
  process.exit(2);
}

let input;
try { input = JSON.parse(raw || '{}'); } catch { console.error('Invalid JSON input'); process.exit(2); }
const baseUrl = String(process.env.EQUIROUTE_URL || input.baseUrl || 'http://localhost:3000').replace(/\/$/, '');
const BSC_USDT = process.env.BSC_USDT_ADDRESS || '0x55d398326f99059fF775485246999027B3197955';

async function analyze() {
  const response = await fetch(`${baseUrl}/api/analyze`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symbol: input.symbol,
      amountUsd: input.amountUsd,
      maxPremiumPercent: input.maxPremiumPercent,
      walletAddress: input.walletAddress,
      deepScan: input.deepScan === true
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  return data;
}

function publicResult(data) {
  const best = data.bestCandidate;
  return {
    verdict: data.verdict,
    reason: data.verdictReason,
    bestRoute: best ? {
      provider: best.providerName,
      symbol: best.tokenSymbol,
      contractAddress: best.tokenAddress,
      displayedGapPercent: best.onChainDeviationPercent,
      executablePremiumPercent: best.allInPremiumPercent,
      hiddenGapPercent: best.executionSurprisePercent,
      marketStatus: best.marketStatus
    } : null,
    wallet: data.walletReadiness,
    routeSavingsUsd: data.routeSavingsUsd,
    liquidityStress: data.liquidityStress || null,
    agenticInstruction: data.agenticHandoff?.instruction,
    requiresExplicitConfirmation: true
  };
}

function bawJson(args) {
  const output = execFileSync('baw', [...args, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(output);
}

try {
  const data = await analyze();
  const guard = publicResult(data);

  if (command === 'analyze') {
    process.stdout.write(JSON.stringify(guard, null, 2));
    process.exit(0);
  }

  // agentic-quote is deliberately read-only. A BLOCK is a hard stop even before asking Agentic Wallet for a second quote.
  if (data.verdict === 'BLOCK' || !data.bestCandidate?.tokenAddress) {
    process.stdout.write(JSON.stringify({ guard, agenticWallet: { attempted: false, reason: 'EquiRoute returned BLOCK; Agentic Wallet quote was not requested.' } }, null, 2));
    process.exit(3);
  }

  const status = bawJson(['wallet', 'status']);
  const walletAddress = bawJson(['wallet', 'address']);
  const quote = bawJson([
    'market-order', 'quote',
    '--fromTokenQty', String(data.amountUsd),
    '--fromToken', BSC_USDT,
    '--toToken', data.bestCandidate.tokenAddress,
    '--binanceChainId', '56'
  ]);

  process.stdout.write(JSON.stringify({
    guard,
    agenticWallet: {
      attempted: true,
      readOnly: true,
      status,
      walletAddress,
      quote,
      note: 'This command never swaps. Re-run EquiRoute if the Agentic Wallet quote materially changes, then require explicit user confirmation before using the official swap command.'
    }
  }, null, 2));
} catch (error) {
  const stderr = error?.stderr ? String(error.stderr).trim() : '';
  console.error(stderr || (error instanceof Error ? error.message : String(error)));
  process.exit(1);
}
