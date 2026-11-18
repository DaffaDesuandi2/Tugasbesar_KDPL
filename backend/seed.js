import { initDatabase, pool } from './database.js';
import { hashPassword, validatePasswordStrength } from './security.js';

async function seedAdmin() {
  const adminName = process.argv[2] || 'Super Admin PosTera';
  const adminEmail = (process.argv[3] || 'admin@postera.ac.id').toLowerCase().trim();
  const adminPassword = process.argv[4] || 'Admin1234';

  const pwdError = validatePasswordStrength(adminPassword);
  if (pwdError) {
    console.error(`Validasi password gagal: ${pwdError}`);
    process.exit(1);
  }

  console.log(`Menjalankan seeder admin untuk: ${adminEmail}...`);

  try {
    await initDatabase();
    const passwordHash = await hashPassword(adminPassword);

    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [adminEmail]);

    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE users 
         SET name = $1, password_hash = $2, role = 'admin', is_active = TRUE, updated_at = NOW()
         WHERE email = $3`,
        [adminName, passwordHash, adminEmail]
      );
      console.log(`Akun admin (${adminEmail}) sudah ada dan berhasil diperbarui.`);
    } else {
      const res = await pool.query(
        `INSERT INTO users (name, email, password_hash, role, is_active, failed_login_attempts, created_at, updated_at)
         VALUES ($1, $2, $3, 'admin', TRUE, 0, NOW(), NOW())
         RETURNING id, name, email, role, is_active`,
        [adminName, adminEmail, passwordHash]
      );
      console.log('Akun admin awal berhasil dibuat:', res.rows[0]);
    }
  } catch (error) {
    console.error('Seeder gagal:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();