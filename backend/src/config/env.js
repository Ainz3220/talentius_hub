import 'dotenv/config';

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || '15m',
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || '7d',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || '0'.repeat(64),
  HMAC_SECRET: process.env.HMAC_SECRET || 'dev-hmac-secret',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@talenthub.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Talentius Hub',
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  OTP_TTL_MINUTES: parseInt(process.env.OTP_TTL_MINUTES || '10', 10),
  isDev: (process.env.NODE_ENV || 'development') === 'development',
};
