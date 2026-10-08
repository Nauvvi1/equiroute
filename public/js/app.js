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
const simulationState = document.querySelector('#simulation-state');
const toast = document.querySelector('#toast');

const money = (value, digits = 2) => Number.isFinite(Number(value))
  ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(Number(value))
  : '—';
const pct = (value, digits = 2) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits)}%` : '—';
const compact = (value, digits = 4) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';

function updateLimit() {
  const value = Number(limitInput.value).toFixed(1);
  limitOutput.value = `${value}%`;
  policyLimit.textContent = `${value}%`;
}
limitInput.addEventListener('input', updateLimit);
updateLimit();

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  window.setTimeout(() => toast.classList.add('hidden'), 5500);
}

function verdictClass(verdict) {
  return String(verdict || '').toLowerCase();
}

function routeBadge(candidate, limit) {
  if (!candidate.quoteAvailable || candidate.allInPremiumPercent == null) return '<span class="badge bad">BLOCK</span>';
  if (candidate.allInPremiumPercent > limit) return '<span class="badge bad">BLOCK</span>';
  if (!candidate.marketOpen) return '<span class="badge warn">CAUTION</span>';
  return '<span class="badge good">ALLOW</span>';
}

function render(data) {
  resultShell.classList.remove('hidden');
  const best = data.bestCandidate;
  const klass = verdictClass(data.verdict);

  decisionCard.className = `decision-card card ${klass}`;
  decisionCard.innerHTML = `
    <div>
      <div class="decision-title"><h2>${data.symbol} · ${data.companyName}</h2></div>
      <p>${data.verdictReason}</p>
    </div>
    <span class="verdict">${data.verdict}</span>
  `;

  const loss = best?.estimatedExecutionLossUsd;
  const premium = best?.allInPremiumPercent;
  metrics.innerHTML = `
    <div class="metric"><span>Reference value</span><strong>${best ? money(best.referencePriceUsd) : '—'}</strong><small>Binance RWA reference per underlying share</small></div>
    <div class="metric"><span>Best executable premium</span><strong>${premium == null ? '—' : pct(premium)}</strong><small>All-in route vs reference exposure</small></div>
    <div class="metric ${loss > 0 ? 'danger' : 'good'}"><span>Estimated avoidable cost</span><strong>${loss == null ? '—' : money(loss)}</strong><small>For ${money(data.amountUsd)} input</small></div>
    <div class="metric"><span>Underlying market</span><strong>${best?.marketStatus || '—'}</strong><small>${best?.marketOpen ? 'Reference market is open' : 'Off-hours deserve extra scrutiny'}</small></div>
  `;

  resultMode.textContent = data.mode === 'live' ? 'LIVE BINANCE WEB3' : 'ILLUSTRATIVE DEMO';
  routesBody.innerHTML = data.candidates.map((candidate, index) => `
    <tr class="${index === 0 && candidate.quoteAvailable ? 'best' : ''}">
      <td class="token-cell"><strong>${candidate.providerName} · ${candidate.tokenSymbol}</strong><span>${candidate.vendorName || candidate.quoteError || 'No live quote'}</span></td>
      <td>${pct(candidate.onChainDeviationPercent)}</td>
      <td>${candidate.allInPremiumPercent == null ? '—' : pct(candidate.allInPremiumPercent)}</td>
      <td>${candidate.priceImpactPercent == null ? '—' : pct(candidate.priceImpactPercent)}</td>
      <td>${candidate.marketStatus || '—'}</td>
      <td>${routeBadge(candidate, data.maxPremiumPercent)}</td>
    </tr>
  `).join('');

  if (best && loss != null) {
    lossTitle.textContent = loss > 0.005 ? `This route could cost about ${money(loss)} more than reference exposure.` : 'Execution is close to reference exposure.';
    lossCopy.textContent = `EquiRoute evaluates the executable output, not only the token's displayed price. Your guard limit is ${pct(data.maxPremiumPercent, 1)}.`;
  } else {
    lossTitle.textContent = 'No executable route could be verified.';
    lossCopy.textContent = 'The guard fails closed: if a live execution quote cannot be checked, EquiRoute does not mark the trade as safe.';
  }

  warnings.innerHTML = (data.warnings || []).map((warning) => `<div class="warning">${warning}</div>`).join('');

  const simulation = best?.approveSimulation;
  if (simulation?.attempted) {
    const ok = simulation.status === 'SUCCESS';
    simulationState.innerHTML = `<strong>${ok ? '✓ Approval dry-run passed' : 'Approval dry-run: ' + (simulation.status || 'unknown')}</strong><span>${simulation.failReason || 'Binance Transaction API simulated the ERC-20 approval without broadcasting it.'}</span>`;
  } else {
    simulationState.innerHTML = `<strong>Approval simulation not available</strong><span>${data.mode === 'demo' ? 'Demo mode shows the intended flow.' : 'A verified RFQ quote and wallet address are required first.'}</span>`;
  }

  resultShell.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Checking live routes…';

  const payload = {
    symbol: document.querySelector('#symbol').value.trim().toUpperCase(),
    amountUsd: Number(document.querySelector('#amountUsd').value),
    maxPremiumPercent: Number(limitInput.value),
    walletAddress: document.querySelector('#walletAddress').value.trim()
  };

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Analysis failed');
    render(data);
  } catch (error) {
    showToast(error.message || 'Could not run execution check');
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Run execution check';
  }
});
