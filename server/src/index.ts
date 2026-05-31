import { app } from './app.js';
import { config } from './config.js';

/**
 * Local / self-hosted entrypoint. Starts a long-running HTTP listener.
 *
 * On Vercel this file is NOT used — `api/index.ts` imports the same `app` and
 * runs it as a serverless function (no `listen()`).
 */
app.listen(config.port, () => {
  console.info(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
});
