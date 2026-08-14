import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';
import { expireOverdueLinks } from './modules/authorizationLink/authorizationLink.service';

const EXPIRY_SWEEP_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Hourly sweep: flips daily authorizations whose day has ended to `expired`
 * (see authorizationLink.service — links are also expired checked-on-read,
 * this just guarantees correctness even if no one reads the collection).
 */
function startExpirySweep(): void {
  setInterval(() => {
    void expireOverdueLinks().catch((err) => {
      logger.error(`expiry sweep failed: ${err}`);
    });
  }, EXPIRY_SWEEP_INTERVAL_MS).unref();
}

async function start(): Promise<void> {
  try {
    await connectDb();
    startExpirySweep();

    const app = createApp();
    app.listen(env.port, () => {
      logger.info(`listening on http://localhost:${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    logger.error(`failed to start server: ${err}`);
    process.exit(1);
  }
}

void start();