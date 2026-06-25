const { query } = require('./config/database');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running database migrations...');
    const sqlPath = path.join(__dirname, '..', 'migrations', '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await query(sql);
    console.log('✅ Migrations completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
