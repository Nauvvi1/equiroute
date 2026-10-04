const form = document.querySelector('#stock-form');
const result = document.querySelector('#result');

form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const symbol = new FormData(form).get('symbol')?.toString().trim().toUpperCase() || 'NVDA';

  result.innerHTML = `
    <strong>${symbol}: connector not wired yet.</strong>
    <span>The local app is working. Next we connect the real Binance Web3 endpoints and replace this stub with live data.</span>
  `;
});
