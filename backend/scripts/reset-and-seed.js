import { pool } from '../src/config/db.js';
import bcrypt from 'bcrypt';

async function reset() {
  console.log('🧹 Cleaning database...');
  try {
    // Disable foreign key checks to truncate everything
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE users');
    await pool.query('TRUNCATE TABLE credentials');
    await pool.query('TRUNCATE TABLE activity_logs');
    await pool.query('TRUNCATE TABLE spreadsheets');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('✅ Database wiped.');

    console.log('🌱 Seeding user: yvemalatha@gmail.com');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('lvu3000times', salt);
    
    await pool.query(
      'INSERT INTO users (email, master_password_hash) VALUES (?, ?)',
      ['yvemalatha@gmail.com', hashedPassword]
    );
    
    console.log('✅ User seeded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Reset failed:', err.message);
    process.exit(1);
  }
}

reset();
