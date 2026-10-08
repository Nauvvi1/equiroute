import assert from 'node:assert/strict';
import test from 'node:test';
import { executionGuardMath } from './executionGuard.js';
import type { QuoteRoute, RwaToken } from '../types/binance.js';

test('converts 100.25 USDT to 18-decimal smallest units', () => {
  assert.equal(executionGuardMath.amountToSmallestUnit(100.25, 18), '100250000000000000000');
});

test('calculates execution premium from quote output', () => {
  const token: RwaToken = {
    binanceChainId: '56', tokenContractAddress: '0x1', platformId: 'ondo', assetType: 1,
    tokenName: 'Example', tokenSymbol: 'EXon', decimals: 18, underlyingTicker: 'EX', underlyingName: 'Example',
    tokenToShareRatio: '1', statusInfo: { openState: true, marketStatus: 'regular', reasonCode: null, reasonMsg: null, nextOpenTime: null, nextCloseTime: null },
    tokenPrice: '101', referencePrice: '100'
  };
  const quote: QuoteRoute = {
    quoteId: 'q', vendorName: 'PcsXRfq', binanceChainId: '56', fromTokenAmount: '100000000000000000000',
    toTokenAmount: '990000000000000000', tradeFee: '0.1', estimateGasFee: null, priceImpactPercent: '-0.2', router: '',
    fromToken: { tokenContractAddress: '0xusdt', tokenSymbol: 'USDT', tokenUnitPrice: '1', decimal: '18' },
    toToken: { tokenContractAddress: '0x1', tokenSymbol: 'EXon', tokenUnitPrice: '101', decimal: '18' },
    executionMode: 'RFQ', approveTarget: null, isBest: true
  };

  const result = executionGuardMath.calculateCandidate(token, quote, 100);
  const premium = result.allInPremiumPercent ?? 0;
  assert.ok(premium > 1);
  assert.equal(result.estimatedUnderlyingShares, 0.99);
});
