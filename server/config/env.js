const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  JWT_SECRET: process.env.JWT_SECRET || 'super-secret-lab-jwt-token-key-change-in-production-2026',
  SESSION_EXPIRY: process.env.SESSION_EXPIRY || '24h',
  DEFAULT_BUFFER_TIME_MINS: parseInt(process.env.DEFAULT_BUFFER_TIME_MINS || '15', 10),
  MAX_BOOKING_HOURS: parseInt(process.env.MAX_BOOKING_HOURS || '4', 10),
  AUTO_FLAG_OVERDUE_MINUTES: parseInt(process.env.AUTO_FLAG_OVERDUE_MINUTES || '15', 10),
};
