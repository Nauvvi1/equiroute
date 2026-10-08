import { Router } from 'express';
import { apiStatus } from '../config/env.js';
import { executionGuardService } from '../services/executionGuard.js';

export const indexRouter = Router();

indexRouter.get('/', (_req, res) => {
  res.render('index', {
    title: 'EquiRoute — Execution Guard',
    apiStatus: apiStatus()
  });
});

indexRouter.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'equiroute',
    ...apiStatus(),
    time: new Date().toISOString()
  });
});

indexRouter.post('/api/analyze', async (req, res) => {
  try {
    const symbol = String(req.body?.symbol || '').trim().toUpperCase();
    const amountUsd = Number(req.body?.amountUsd);
    const maxPremiumPercent = Number(req.body?.maxPremiumPercent);
    const walletAddress = String(req.body?.walletAddress || '').trim();

    if (!/^[A-Z0-9.-]{1,12}$/.test(symbol)) {
      return res.status(400).json({ error: 'Enter a valid ticker, for example NVDA.' });
    }
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 1000000) {
      return res.status(400).json({ error: 'Amount must be greater than 0.' });
    }
    if (!Number.isFinite(maxPremiumPercent) || maxPremiumPercent < 0 || maxPremiumPercent > 20) {
      return res.status(400).json({ error: 'Guard limit must be between 0% and 20%.' });
    }
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Wallet address must be a valid EVM 0x address.' });
    }

    const analysis = await executionGuardService.analyze({
      symbol,
      amountUsd,
      maxPremiumPercent,
      walletAddress: walletAddress || undefined
    });

    return res.json(analysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});
