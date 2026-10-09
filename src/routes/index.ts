import { Router } from 'express';
import { apiStatus, env } from '../config/env.js';
import { runWithTelemetry } from '../lib/telemetry.js';
import { executionGuardService } from '../services/executionGuard.js';

export const indexRouter = Router();

indexRouter.get('/', (_req, res) => {
  res.render('index', {
    title: 'EquiRoute — Execution Firewall',
    apiStatus: apiStatus(),
    links: {
      github: env.githubUrl,
      docs: `${env.githubUrl}/tree/main/docs`,
      demo: env.demoUrl
    }
  });
});

indexRouter.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'equiroute', version: '1.2.0', ...apiStatus(), time: new Date().toISOString() });
});

indexRouter.post('/api/analyze', async (req, res) => {
  try {
    const symbol = String(req.body?.symbol || '').trim().toUpperCase();
    const amountUsd = Number(req.body?.amountUsd);
    const maxPremiumPercent = Number(req.body?.maxPremiumPercent);
    const walletAddress = String(req.body?.walletAddress || '').trim();
    const deepScan = req.body?.deepScan === true;

    if (!/^[A-Z0-9.-]{1,12}$/.test(symbol)) return res.status(400).json({ error: 'Enter a valid ticker, for example NVDA.' });
    if (!Number.isFinite(amountUsd) || amountUsd <= 0 || amountUsd > 1_000_000) return res.status(400).json({ error: 'Amount must be greater than 0.' });
    if (!Number.isFinite(maxPremiumPercent) || maxPremiumPercent < 0 || maxPremiumPercent > 20) return res.status(400).json({ error: 'Guard limit must be between 0% and 20%.' });
    if (walletAddress && !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) return res.status(400).json({ error: 'Wallet address must be a valid EVM 0x address.' });

    const traced = await runWithTelemetry(() => executionGuardService.analyze({
      symbol, amountUsd, maxPremiumPercent, walletAddress: walletAddress || undefined, deepScan
    }));
    traced.value.telemetry = traced.value.mode === 'demo' && traced.value.telemetry.length ? traced.value.telemetry : traced.telemetry;
    return res.json(traced.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return res.status(500).json({ error: message });
  }
});
