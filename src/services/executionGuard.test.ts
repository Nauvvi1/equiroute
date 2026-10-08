import assert from 'node:assert/strict';
import test from 'node:test';
import { executionGuardMath } from './executionGuard.js';
import type { QuoteRoute, RwaToken } from '../types/binance.js';

test('converts 100.25 USDT to 18-decimal smallest units', () => {
  assert.equal(executionGuardMath.amountToSmallestUnit(100.25, 18), '100250000000000000000');
});

test('executable premium can be materially worse than displayed token/reference gap', () => {
  const token: RwaToken = {
    binanceChainId: '56', tokenContractAddress: '0x1', platformId: 'ondo', assetType: 1,
    tokenName: 'Example', tokenSymbol: 'EXon', decimals: 18, underlyingTicker: 'EX', underlyingName: 'Example',
    tokenToShareRatio: '1', statusInfo: { openState: true, marketStatus: 'regular', reasonCode: null, reasonMsg: null, nextOpenTime: null, nextCloseTime: null },
    tokenPrice: '100.17', referencePrice: '100'
  };
  const quote: QuoteRoute = {
    quoteId: 'q', vendorName: 'PcsXRfq', binanceChainId: '56', fromTokenAmount: '100000000000000000000',
    toTokenAmount: '987000000000000000', tradeFee: '0', estimateGasFee: null, priceImpactPercent: '0.01', router: '',
    fromToken: { tokenContractAddress: '0xusdt', tokenSymbol: 'USDT', tokenUnitPrice: '1', decimal: '18' },
    toToken: { tokenContractAddress: '0x1', tokenSymbol: 'EXon', tokenUnitPrice: '100.17', decimal: '18' },
    executionMode: 'RFQ', approveTarget: null, isBest: true
  };
  const result = executionGuardMath.calculateCandidate(token, quote, 100, 1);
  assert.ok((result.allInPremiumPercent ?? 0) > 1);
  assert.ok((result.executionSurprisePercent ?? 0) > 0.8);
  assert.equal(result.routeVerdict, 'BLOCK');
});


test('displayed gap respects tokenToShareRatio instead of comparing one token to one share blindly', () => {
  const token: RwaToken = {
    binanceChainId: '56', tokenContractAddress: '0x2', platformId: 'ondo', assetType: 1,
    tokenName: 'Ratio Example', tokenSymbol: 'RATIOon', decimals: 18, underlyingTicker: 'RATIO', underlyingName: 'Ratio Example',
    tokenToShareRatio: '2', statusInfo: { openState: true, marketStatus: 'regular', reasonCode: null, reasonMsg: null, nextOpenTime: null, nextCloseTime: null },
    tokenPrice: '200', referencePrice: '100'
  };
  const quote: QuoteRoute = {
    quoteId: 'q2', vendorName: 'PcsXRfq', binanceChainId: '56', fromTokenAmount: '200000000000000000000',
    toTokenAmount: '1000000000000000000', tradeFee: '0', estimateGasFee: null, priceImpactPercent: '0', router: '',
    fromToken: { tokenContractAddress: '0xusdt', tokenSymbol: 'USDT', tokenUnitPrice: '1', decimal: '18' },
    toToken: { tokenContractAddress: '0x2', tokenSymbol: 'RATIOon', tokenUnitPrice: '200', decimal: '18' },
    executionMode: 'RFQ', approveTarget: null, isBest: true
  };
  const result = executionGuardMath.calculateCandidate(token, quote, 200, 1);
  assert.ok(Math.abs(result.onChainDeviationPercent) < 0.000001);
});
