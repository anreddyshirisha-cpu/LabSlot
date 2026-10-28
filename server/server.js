const app = require('./app');
const config = require('./config/env');
const { isConfigured } = require('./db/supabaseClient');

const PORT = config.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('================================================================');
  console.log(' SHARED LABORATORY EQUIPMENT BOOKING & CONFLICT PREVENTION SYSTEM');
  console.log('================================================================');
  console.log(` Server running locally on: http://localhost:${PORT}`);
  console.log(` Environment:              ${config.NODE_ENV}`);
  console.log(` Supabase Status:          ${isConfigured() ? 'CONNECTED (Cloud PostgreSQL)' : 'LOCAL PERSISTENT STORE (Ready for instant demo)'}`);
  console.log(' Demo Accounts:');
  console.log('   Admin:    admin@labhub.edu    / Password123!');
  console.log('   Operator: operator@labhub.edu / Password123!');
  console.log('   Student:  student@labhub.edu  / Password123!');
  console.log('================================================================');
});

// Handle graceful termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, closing server...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, closing server...');
  server.close(() => process.exit(0));
});

module.exports = server;
