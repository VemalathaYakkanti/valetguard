import { pool } from './src/config/db.js';

async function check() {
  try {
    const [users] = await pool.query('SELECT id, email, two_factor_enabled FROM users');
    console.log('Users in DB:', users);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

check();
