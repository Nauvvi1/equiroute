import test from 'node:test';
import assert from 'node:assert/strict';
import { weiHexToBnb } from './bscRpcService.js';

test('converts native BNB balance from wei hex', () => {
  assert.equal(weiHexToBnb('0xde0b6b3a7640000'), 1);
  assert.equal(weiHexToBnb('0x16345785d8a0000'), 0.1);
});
