const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { Pool } = require('pg');
const config = require('../config/env');

let supabase = null;
let pgPool = null;
let isConfigured = false;

if (config.SUPABASE_URL && (config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY)) {
  const key = config.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_ANON_KEY;
  try {
    supabase = createClient(config.SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      realtime: {
        transport: WebSocket,
      },
    });
    isConfigured = true;
    console.log('[Database] Supabase client initialized with endpoint:', config.SUPABASE_URL);

    // Initialize PostgreSQL connection pool for direct database execution
    pgPool = new Pool({
      host: 'aws-0-ap-southeast-2.pooler.supabase.com',
      port: 5432,
      user: 'postgres.flleiwgoknujhtxtgkpd',
      password: 'Rakshitha@2008',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000
    });
    console.log('[Database] Direct PostgreSQL connection pool established on Supabase pooler (port 5432).');
  } catch (err) {
    console.warn('[Database] Failed to initialize Supabase client:', err.message);
  }
} else {
  console.log('[Database] Operating in local fallback simulation mode.');
}

module.exports = {
  supabase,
  pgPool,
  isConfigured: () => isConfigured
};
