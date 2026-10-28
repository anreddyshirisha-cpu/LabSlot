// runMigrations.js - Executes SQL migrations and seed data directly on Supabase PostgreSQL
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function runMigrations() {
  console.log('Connecting to Supabase PostgreSQL...');

  const client = new Client({
    host: 'aws-0-ap-southeast-2.pooler.supabase.com',
    port: 5432,
    user: 'postgres.flleiwgoknujhtxtgkpd',
    password: 'Rakshitha@2008',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  console.log('Connected to Supabase PostgreSQL (Sydney aws-0-ap-southeast-2).');

  // 1. Read and execute Schema Migration
  const schemaPath = path.join(__dirname, '../../supabase/migrations/20261027_001_initial_schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`Executing schema migration (${schemaSql.length} bytes)...`);
  await client.query(schemaSql);
  console.log('Schema migration successfully applied! Tables, triggers, indexes, and RLS enabled.');

  // 2. Read and execute Seed Data
  const seedPath = path.join(__dirname, '../../supabase/seed/20261027_002_seed_data.sql');
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  console.log(`Executing seed data (${seedSql.length} bytes)...`);
  await client.query(seedSql);
  console.log('Seed data successfully applied! Users, equipment, bookings, and audit records created.');

  // 3. Verify counts
  const usersRes = await client.query('SELECT count(*) FROM public.users;');
  const equipRes = await client.query('SELECT count(*) FROM public.equipment;');
  const bookRes = await client.query('SELECT count(*) FROM public.bookings;');
  const maintRes = await client.query('SELECT count(*) FROM public.maintenance_blocks;');
  const incRes = await client.query('SELECT count(*) FROM public.incidents_damage;');

  console.log('\n--- VERIFICATION IN SUPABASE DATABASE ---');
  console.log('Users in Supabase:              ', usersRes.rows[0].count);
  console.log('Instruments in Supabase:        ', equipRes.rows[0].count);
  console.log('Bookings in Supabase:           ', bookRes.rows[0].count);
  console.log('Maintenance blocks in Supabase: ', maintRes.rows[0].count);
  console.log('Incidents in Supabase:          ', incRes.rows[0].count);
  console.log('-----------------------------------------');

  await client.end();
}

runMigrations()
  .then(() => {
    console.log('MIGRATION AND SEED COMPLETED WITH 100% SUCCESS.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
