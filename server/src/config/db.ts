import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export async function connectDb(): Promise<void> {
  mongoose.connection.on('connected', () => {
    logger.info('connected to MongoDB');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error: %s', err.message);
  });

  await mongoose.connect(env.mongoUri);
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}