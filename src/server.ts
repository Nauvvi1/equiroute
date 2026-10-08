import { app } from './app.js';
import { env, apiStatus } from './config/env.js';

app.listen(env.port, () => {
  const status = apiStatus();
  console.log(`EquiRoute: http://localhost:${env.port}`);
  console.log(`Mode: ${status.mode} | BSC chainId: ${status.chainId}`);
});
