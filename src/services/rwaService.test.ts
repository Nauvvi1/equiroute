import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMarketStatus } from './rwaService.js';

test('normalizes bStocks-style open status when marketStatus is omitted', () => {
  const status = normalizeMarketStatus({
    openState: true,
    marketStatus: '',
    reasonCode: 'TRADING',
    reasonMsg: 'TRADING',
    nextOpenTime: null,
    nextCloseTime: null
  });

  assert.equal(status.openState, true);
  assert.equal(status.marketStatus, 'regular');
});

test('normalizes a closed market from openState/reason code', () => {
  const status = normalizeMarketStatus({
    openState: false,
    reasonCode: 'MARKET_CLOSED',
    reasonMsg: 'Weekend or Holiday'
  });

  assert.equal(status.openState, false);
  assert.equal(status.marketStatus, 'closed');
});

test('preserves explicit Binance market session values', () => {
  const status = normalizeMarketStatus({
    openState: true,
    marketStatus: 'premarket',
    reasonCode: null,
    reasonMsg: null
  });

  assert.equal(status.openState, true);
  assert.equal(status.marketStatus, 'premarket');
});
