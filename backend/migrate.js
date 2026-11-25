import { initDatabase, pool } from './database.js';

async function runMigration() {
  console.log('Running database migration for PostgreSQL...');
  try {
    await initDatabase();
    console.log('Migration completed: tables users, sessions, articles, article_comments, and audit_logs are ready.\n');

    const constraintsRes = await pool.query(`
      SELECT 
        tc.table_name AS tabel,
        tc.constraint_name AS nama_constraint,
        tc.constraint_type AS tipe
      FROM information_schema.table_constraints tc
      WHERE tc.table_schema = 'public'
        AND tc.table_name IN ('users', 'sessions', 'articles', 'article_comments', 'audit_logs')
        AND tc.constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE', 'CHECK')
      ORDER BY tc.table_name, tc.constraint_type;
    `);

    console.log('Daftar Constraint Aktif di PostgreSQL:');
    console.table(constraintsRes.rows);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();