import 'dotenv/config';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/apea',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
  logLevel: process.env.LOG_LEVEL ?? 'http',
  // TODO: require JWT_SECRET in production instead of defaulting.
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  qrTokenSecret: process.env.QR_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-production',
};