# Deployment

## Before deployment

1. Revoke any Web3 API secret that has ever appeared in a screenshot/chat/log and create a fresh one.
2. Keep `.env` local; configure secrets in the hosting provider's environment-variable UI.
3. Use `DEMO_MODE=false` for the judging deployment.
4. Confirm the deployment can reach `https://web3.binance.com/build`.

Required environment variables:

```env
NODE_ENV=production
DEMO_MODE=false
BINANCE_WEB3_API_KEY=...
BINANCE_WEB3_SECRET_KEY=...
BINANCE_WEB3_BASE_URL=https://web3.binance.com/build
BINANCE_WEB3_RECV_WINDOW=10000
BSC_CHAIN_ID=56
BSC_USDT_ADDRESS=0x55d398326f99059fF775485246999027B3197955
BSC_USDT_DECIMALS=18
```

The host normally injects `PORT`; otherwise the app defaults to `3000`.

## Generic Node deploy

Build and run the production server:

```bash
npm install
npm run build
npm start
```

Health check:

```text
GET /api/health
```

## Render / Railway / similar

Create a Node.js web service from the public GitHub repository. Use `npm install && npm run build` as the build command and `npm start` as the start command. Add the environment variables above and use `/api/health` as the health-check path when supported.

Do not put API secrets in the repository, build arguments, README, frontend JavaScript or demo video.
