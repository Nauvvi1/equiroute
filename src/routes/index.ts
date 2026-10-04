import { Router } from 'express';
import { binanceWeb3Service } from '../services/binanceWeb3.js';

export const indexRouter = Router();

indexRouter.get('/', (_req, res) => {
  res.render('index', {
    title: 'EquiRoute',
    apiStatus: binanceWeb3Service.getStatus()
  });
});

indexRouter.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'equiroute',
    time: new Date().toISOString()
  });
});

indexRouter.get('/api/config-status', (_req, res) => {
  res.json(binanceWeb3Service.getStatus());
});
