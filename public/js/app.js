const form = document.querySelector('#guard-form');
const limitInput = document.querySelector('#maxPremiumPercent');
const limitOutput = document.querySelector('#limit-output');
const policyLimit = document.querySelector('#policy-limit');
const button = document.querySelector('#analyze-button');
const resultShell = document.querySelector('#result-shell');
const decisionCard = document.querySelector('#decision-card');
const metrics = document.querySelector('#metrics');
const routesBody = document.querySelector('#routes-body');
const resultMode = document.querySelector('#result-mode');
const lossTitle = document.querySelector('#loss-title');
const lossCopy = document.querySelector('#loss-copy');
const warnings = document.querySelector('#warnings');
const walletState = document.querySelector('#wallet-state');
const simulationState = document.querySelector('#simulation-state');
const apiTrace = document.querySelector('#api-trace');
const agentStatus = document.querySelector('#agent-status');
const agentInstruction = document.querySelector('#agent-instruction');
const copyAgent = document.querySelector('#copy-agent');
const connectWallet = document.querySelector('#connect-wallet');
const walletInput = document.querySelector('#walletAddress');
const deepScan = document.querySelector('#deepScan');
const stressCard = document.querySelector('#stress-card');
const stressTitle = document.querySelector('#stress-title');
const stressCopy = document.querySelector('#stress-copy');
const stressGrid = document.querySelector('#stress-grid');
const toast = document.querySelector('#toast');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}
function money(value) { return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : '—'; }
function pct(value, digits = 2) { const n = Number(value); return Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%` : '—'; }

function arrowIcon() {
  return '<svg class="inline-arrow" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h10"></path><path d="M10 4l6 6-6 6"></path></svg>';
}

function statusIcon(type = 'ok') {
  if (type === 'bad') return '<span class="status-inline bad"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.25"></circle><path d="M7 7l6 6M13 7l-6 6"></path></svg></span>';
  if (type === 'warn') return '<span class="status-inline warn"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.25"></circle><path d="M10 5.8v5.2"></path><path d="M10 14h.01"></path></svg></span>';
  return '<span class="status-inline ok"><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.25"></circle><path d="M6.3 10.3l2.4 2.5 5-5.4"></path></svg></span>';
}
function verdictClass(value) { return String(value || '').toLowerCase(); }
function routeBadge(candidate) { const c = verdictClass(candidate.routeVerdict); return `<span class="badge ${c === 'allow' ? 'good' : c === 'caution' ? 'warn' : 'bad'}" title="${escapeHtml(candidate.routeReason)}">${escapeHtml(candidate.routeVerdict)}</span>`; }
function formatTime(ts) { if (!ts) return ''; try { return new Date(Number(ts)).toLocaleString(); } catch { return ''; } }
function showToast(message) { toast.textContent = message; toast.classList.remove('hidden'); setTimeout(() => toast.classList.add('hidden'), 4500); }

function updatePolicy() {
  const value = Number(limitInput.value).toFixed(1) + '%';
  limitOutput.textContent = value;
  policyLimit.textContent = value;
}
limitInput.addEventListener('input', updatePolicy);
updatePolicy();

function renderWallet(wallet, amountUsd) {
  if (!wallet?.checked) {
    walletState.innerHTML = `<strong class="warn-text">Readiness unavailable</strong><span>${escapeHtml(wallet?.error || 'Wallet API check did not complete.')}</span>`;
    return;
  }
  const funding = wallet.hasEnoughUsdt ? statusIcon('ok') : statusIcon('bad');
  const gas = wallet.hasGas ? statusIcon('ok') : statusIcon('bad');
  const gasDetail = wallet.estimatedNetworkFeeUsd != null
    ? ` Estimated network fee ${money(wallet.estimatedNetworkFeeUsd)}; safety buffer ${money(wallet.gasSafetyBufferUsd)}.`
    : '';
  walletState.innerHTML = `<strong>${funding}<span>${money(wallet.usdtBalance)} USDT</span> · ${gas}<span>${Number(wallet.bnbBalance || 0).toFixed(5)} BNB</span></strong><span>${wallet.hasEnoughUsdt ? `Enough USDT for ${money(amountUsd)}.` : `Not enough USDT for ${money(amountUsd)}.`} ${wallet.hasGas ? 'BNB gas reserve passes.' : 'BNB gas reserve is not sufficient/verified.'}${gasDetail}</span>`;
}


function renderStress(stress) {
  if (!stress?.routes?.length) { stressCard.classList.add('hidden'); return; }
  stressCard.classList.remove('hidden');
  stressTitle.textContent = `${stress.multiplier}× size stress probe`;
  stressCopy.textContent = `The same tokenized-stock representations were re-quoted at ${money(stress.stressedAmountUsd)} versus the ${money(stress.baseAmountUsd)} base order. A positive Δ means execution quality deteriorated as size increased.`;
  stressGrid.innerHTML = stress.routes.map((route) => {
    if (!route.quoteAvailable) return `<div class="stress-item"><div><strong>${escapeHtml(route.providerName)} · ${escapeHtml(route.tokenSymbol)}</strong><span>Stress quote unavailable</span></div><b class="warn-text">—</b><small>${escapeHtml(route.error || 'No quote')}</small></div>`;
    const delta = Number(route.deteriorationPercent);
    const cls = delta > 0.5 ? 'danger-text' : delta > 0.15 ? 'warn-text' : 'good-text';
    return `<div class="stress-item"><div><strong>${escapeHtml(route.providerName)} · ${escapeHtml(route.tokenSymbol)}</strong><span>${pct(route.basePremiumPercent)} <span class="stress-arrow">${arrowIcon()}</span> ${pct(route.stressedPremiumPercent)}</span></div><b class="${cls}">${pct(delta)}</b><small>Δ premium · impact ${pct(route.stressedPriceImpactPercent)}</small></div>`;
  }).join('');
}

function render(data) {
  resultShell.classList.remove('hidden');
  const best = data.bestCandidate;
  const klass = verdictClass(data.verdict);
  decisionCard.className = `decision-card card ${klass}`;
  decisionCard.innerHTML = `<div><div class="decision-title"><h2>${escapeHtml(data.symbol)} · ${escapeHtml(data.companyName)}</h2></div><p>${escapeHtml(data.verdictReason)}</p></div><span class="verdict">${escapeHtml(data.verdict)}</span>`;

  const premium = best?.allInPremiumPercent;
  const hiddenGap = best?.executionSurprisePercent;
  const savings = data.routeSavingsUsd;
  const nextOpen = best && !best.marketOpen ? formatTime(best.nextOpenTime) : '';
  metrics.innerHTML = `
    <div class="metric"><span>Reference / share</span><strong>${best ? money(best.referencePriceUsd) : '—'}</strong><small>Binance RWA reference value</small></div>
    <div class="metric ${Number(premium) > data.maxPremiumPercent ? 'danger' : 'good'}"><span>Best executable premium</span><strong>${premium == null ? '—' : pct(premium)}</strong><small>Actual route vs reference exposure</small></div>
    <div class="metric ${Math.abs(Number(hiddenGap)) > .5 ? 'danger' : ''}"><span>Hidden execution gap</span><strong>${hiddenGap == null ? '—' : pct(hiddenGap)}</strong><small>Executable premium minus displayed gap</small></div>
    <div class="metric ${Number(savings) > 0 ? 'good' : ''}"><span>Route advantage</span><strong>${savings == null ? '—' : money(savings)}</strong><small>${data.alternativeCandidate ? `More reference exposure vs ${escapeHtml(data.alternativeCandidate.tokenSymbol)}` : 'No comparable alternative quote'}</small></div>
    <div class="metric wide"><span>Underlying market</span><strong>${escapeHtml(best?.marketStatus || '—')}</strong><small>${best?.marketOpen ? 'Traditional market is open' : (nextOpen ? `Next open: ${escapeHtml(nextOpen)}` : 'Off-hours require extra scrutiny')}</small></div>`;

  resultMode.textContent = data.mode === 'live' ? 'LIVE BINANCE WEB3' : 'ILLUSTRATIVE DEMO';
  routesBody.innerHTML = data.candidates.map((candidate) => {
    const bestRow = best && candidate.tokenAddress === best.tokenAddress;
    return `<tr class="${bestRow ? 'best' : ''}">
      <td class="token-cell"><strong>${escapeHtml(candidate.providerName)} · ${escapeHtml(candidate.tokenSymbol)} ${bestRow ? '<span class="best-label">BEST</span>' : ''}</strong><span>${escapeHtml(candidate.vendorName || candidate.quoteError || 'No live quote')}</span><span class="contract">${escapeHtml(candidate.tokenAddress)}</span></td>
      <td>${pct(candidate.onChainDeviationPercent)}</td><td>${candidate.allInPremiumPercent == null ? '—' : pct(candidate.allInPremiumPercent)}</td>
      <td class="${Math.abs(Number(candidate.executionSurprisePercent || 0)) > .5 ? 'danger-text' : ''}">${candidate.executionSurprisePercent == null ? '—' : pct(candidate.executionSurprisePercent)}</td>
      <td>${candidate.priceImpactPercent == null ? '—' : pct(candidate.priceImpactPercent)}</td>
      <td>${escapeHtml(candidate.marketStatus || '—')}<span class="subcell">${escapeHtml(candidate.marketReason || '')}</span></td><td>${routeBadge(candidate)}</td></tr>`;
  }).join('');

  if (best && data.routeSavingsUsd != null && data.alternativeCandidate) {
    lossTitle.textContent = data.routeSavingsUsd > 0.005 ? `Best route preserves about ${money(data.routeSavingsUsd)} more value.` : 'Available routes are economically close.';
    lossCopy.textContent = `For the same ${money(data.amountUsd)} input, ${best.tokenSymbol} currently delivers more reference-equivalent underlying exposure than ${data.alternativeCandidate.tokenSymbol}. This is calculated from executable quote output, not the displayed token price.`;
  } else if (best?.estimatedExecutionLossUsd != null) {
    lossTitle.textContent = best.estimatedExecutionLossUsd > 0.005 ? `Execution drag is about ${money(best.estimatedExecutionLossUsd)} vs reference.` : 'Execution is close to reference exposure.';
    lossCopy.textContent = `Your firewall limit is ${Number(data.maxPremiumPercent).toFixed(1)}%.`;
  } else {
    lossTitle.textContent = 'No executable route could be verified.';
    lossCopy.textContent = 'EquiRoute fails closed when a live quote cannot be checked.';
  }
  warnings.innerHTML = (data.warnings || []).map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('');

  renderStress(data.liquidityStress);
  renderWallet(data.walletReadiness, data.amountUsd);
  const simulation = best?.approveSimulation;
  if (simulation?.attempted) {
    const ok = simulation.status === 'SUCCESS';
    simulationState.innerHTML = `<strong class="${ok ? 'good-text' : 'warn-text'}">${ok ? `${statusIcon('ok')}<span>Approval dry-run passed</span>` : `${statusIcon('warn')}<span>Approval dry-run: ${escapeHtml(simulation.status || 'unknown')}</span>`}</strong><span>${escapeHtml(simulation.failReason || 'Binance Transaction API simulated the ERC-20 approval without broadcasting it.')}</span>`;
  } else {
    simulationState.innerHTML = `<strong>Approval simulation unavailable</strong><span>${data.mode === 'demo' ? 'Demo mode shows the intended flow.' : 'The price firewall still reports quote quality; inspect the API trace for the failed module.'}</span>`;
  }

  apiTrace.innerHTML = (data.telemetry || []).map((item) => `<div class="trace-row"><span class="trace-module">${escapeHtml(item.module)}</span><span>${escapeHtml(item.operation)}</span><b>${item.durationMs} ms</b><i class="${item.success ? 'trace-ok' : 'trace-bad'}">${item.success ? 'OK' : 'FAIL'}</i></div>`).join('') || '<div class="muted">No API trace available.</div>';

  agentStatus.textContent = data.agenticHandoff?.status === 'READY' ? 'Policy passed. A Wallet Skill may hand this verified token to Agentic Wallet — only after explicit confirmation.' : data.agenticHandoff?.status === 'CAUTION' ? 'Policy is not a clean ALLOW. An agent must stop and ask the user before any execution.' : 'Hard stop. The agent must not execute this trade.';
  agentInstruction.textContent = data.agenticHandoff?.instruction || '';
  copyAgent.dataset.copy = data.agenticHandoff?.instruction || '';
  resultShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


connectWallet.addEventListener('click', async () => {
  if (!window.ethereum?.request) { showToast('No browser EVM wallet detected. You can paste any public BSC 0x address instead.'); return; }
  connectWallet.disabled = true;
  try {
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const address = Array.isArray(accounts) ? accounts[0] : '';
    if (!address) throw new Error('Wallet did not return an address');
    walletInput.value = address;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    showToast(chainId === '0x38' ? 'BSC wallet connected (public address only)' : 'Wallet connected. For execution context, switch the wallet to BNB Smart Chain (chain 56).');
  } catch (error) { showToast(error?.message || 'Wallet connection was cancelled'); }
  finally { connectWallet.disabled = false; }
});

copyAgent.addEventListener('click', async () => {
  const value = copyAgent.dataset.copy || '';
  if (!value) return;
  try { await navigator.clipboard.writeText(value); showToast('Agent instruction copied'); }
  catch { showToast('Could not copy automatically'); }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Checking live routes…';
  const payload = {
    symbol: document.querySelector('#symbol').value.trim().toUpperCase(),
    amountUsd: Number(document.querySelector('#amountUsd').value),
    maxPremiumPercent: Number(limitInput.value),
    walletAddress: walletInput.value.trim(),
    deepScan: Boolean(deepScan?.checked)
  };
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed');
    render(data);
  } catch (error) { showToast(error.message || 'Could not run execution check'); }
  finally { button.disabled = false; button.querySelector('span:first-child').textContent = 'Run execution firewall'; }
});

// Landing-page examples: preload the ticker and move straight to the live checker.
document.querySelectorAll('[data-ticker]').forEach((control) => {
  control.addEventListener('click', () => {
    const symbolInput = document.querySelector('#symbol');
    if (symbolInput) symbolInput.value = String(control.dataset.ticker || '').toUpperCase();
    document.querySelector('#checker')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => symbolInput?.focus(), 450);
  });
});
