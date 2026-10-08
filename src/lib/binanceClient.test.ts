import assert from 'node:assert/strict';
import test from 'node:test';
import crypto from 'node:crypto';
import { createSignature, encodeQuery } from './binanceClient.js';

test('encodeQuery uses %20 for spaces and preserves order', () => {
  assert.equal(encodeQuery({ chainId: 56, symbol: 'ETH USDT' }), 'chainId=56&symbol=ETH%20USDT');
});

test('createSignature matches HMAC-SHA256 base64', () => {
  const input = {
    timestamp: '2026-05-11T10:08:57.715Z',
    method: 'GET',
    requestPath: '/build/api/v1/dex/market/price?chainId=1&symbol=ETH%20USDT',
    body: '',
    secretKey: 'test-secret'
  };

  const expected = crypto
    .createHmac('sha256', input.secretKey)
    .update(input.timestamp + input.method + input.requestPath + input.body, 'utf8')
    .digest('base64');

  assert.equal(createSignature(input), expected);
});
