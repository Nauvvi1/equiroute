import assert from 'node:assert/strict';
import test from 'node:test';
import { createSignature, encodeQuery } from './binanceClient.js';

test('query encoder uses percent encoding and preserves insertion order', () => {
  assert.equal(encodeQuery({ a: 'hello world', b: 56 }), 'a=hello%20world&b=56');
});

test('signature is stable for the same pre-hash', () => {
  const one = createSignature({ timestamp: '2026-05-11T10:08:57.715Z', method: 'GET', requestPath: '/build/api/v1/test', body: '', secretKey: 'secret' });
  const two = createSignature({ timestamp: '2026-05-11T10:08:57.715Z', method: 'GET', requestPath: '/build/api/v1/test', body: '', secretKey: 'secret' });
  assert.equal(one, two);
  assert.ok(one.length > 20);
});
