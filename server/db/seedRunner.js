const fs = require('fs');
const path = require('path');
const { supabase, isConfigured } = require('./supabaseClient');
const db = require('./dbAdapter');

async function runSeed() {
  console.log('[Seed] Initializing database seeding sequence...');

  if (isConfigured()) {
    console.log('[Seed] Supabase connection detected. Running cloud seed...');
    const seedPath = path.join(__dirname, '../../supabase/seed/20261027_002_seed_data.sql');
    if (fs.existsSync(seedPath)) {
      const sql = fs.readFileSync(seedPath, 'utf8');
      console.log(`[Seed] Loaded SQL seed file (${sql.length} bytes).`);
      console.log('[Seed] Please ensure 20261027_001_initial_schema.sql and 20261027_002_seed_data.sql have been run in your Supabase SQL Editor.');
    }
  } else {
    console.log('[Seed] Supabase not connected. Resetting local in-memory persistent store to pristine seed data...');
    db.resetLocalStore();
    console.log('[Seed] Local store successfully refreshed with 4 users, 6 instruments, bookings, maintenance blocks, and audit telemetry.');
  }

  console.log('[Seed] Seeding sequence complete.');
}

if (require.main === module) {
  runSeed().then(() => process.exit(0)).catch((err) => {
    console.error('[Seed Error]:', err);
    process.exit(1);
  });
}

module.exports = { runSeed };
