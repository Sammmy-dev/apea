import cors from 'cors';
import express, { type Express, type Request, type Response } from 'express';
import { env } from './config/env';
import { logger } from './config/logger';

function requestLogger(req: Request, res: Response, next: express.NextFunction): void {
  const start = Date.now();
  res.on('finish', () => {
    logger.http(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
}

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  return app;
}