import { initDatabase, pool } from './database.js';

async function runMigration() {
  console.log('Running database migration for PostgreSQL...');
  try {
    await initDatabase();
    console.log('Migration completed: tables users, sessions, posters, poster_likes, and poster_comments are ready.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();