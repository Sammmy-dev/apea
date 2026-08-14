import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { logger } from './config/logger';

async function start(): Promise<void> {
  try {
    await connectDb();

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