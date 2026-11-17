import { initDatabase, pool } from './database.js';

async function runMigration() {
  console.log('Running database migration for PostgreSQL...');
  try {
    await initDatabase();
    console.log('Migration completed successfully: tables users & sessions ready.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();
