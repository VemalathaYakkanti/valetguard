import { pool } from './config/db.js';

const tables = [
  `CREATE TABLE IF NOT EXISTS users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) UNIQUE NOT NULL,
      master_password_hash VARCHAR(255) NOT NULL,
      two_factor_enabled BOOLEAN DEFAULT FALSE,
      two_factor_secret VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS folders (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(50),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS credentials (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      folder_id BIGINT NULL,
      title VARCHAR(255) NOT NULL,
      url VARCHAR(500),
      username VARCHAR(255),
      encrypted_password TEXT NOT NULL,
      iv VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      encrypted_notes TEXT,
      encrypted_custom_fields JSON,
      tags JSON,
      is_favorite BOOLEAN DEFAULT FALSE,
      encrypted_totp_secret TEXT,
      totp_iv VARCHAR(255),
      totp_salt VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      action VARCHAR(100) NOT NULL,
      details JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS spreadsheets (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      user_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      data JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS guest_users (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      created_by_user_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      employer VARCHAR(255),
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      setup_otp_hash VARCHAR(255),
      otp_expires_at TIMESTAMP,
      is_activated BOOLEAN DEFAULT FALSE,
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS shared_credentials (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      guest_user_id BIGINT NOT NULL,
      credential_id BIGINT NOT NULL,
      can_view_password BOOLEAN DEFAULT FALSE,
      can_copy_password BOOLEAN DEFAULT FALSE,
      can_view_notes BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE CASCADE,
      FOREIGN KEY (credential_id) REFERENCES credentials(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS folder_files (
      id BIGINT PRIMARY KEY AUTO_INCREMENT,
      folder_slug VARCHAR(100) NOT NULL,
      user_id BIGINT NOT NULL,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      size VARCHAR(50) DEFAULT '1 KB',
      content LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`
];

// Migration: safely add columns to existing databases that predate this schema
const migrations = [
  `ALTER TABLE credentials ADD COLUMN encrypted_totp_secret TEXT`,
  `ALTER TABLE credentials ADD COLUMN totp_iv VARCHAR(255)`,
  `ALTER TABLE credentials ADD COLUMN totp_salt VARCHAR(255)`,
  `ALTER TABLE folders ADD COLUMN slug VARCHAR(100) NOT NULL DEFAULT 'custom'`,
  `ALTER TABLE folder_files MODIFY COLUMN content LONGTEXT`,
];

async function setup() {
  console.log('🚀 Initializing TiDB Tables...');
  try {
    for (const sql of tables) {
      await pool.query(sql);
    }
    console.log('✅ All tables created successfully!');

    // Run migrations — safe to re-run, ignore "Duplicate column" errors (errno 1060)
    console.log('🔄 Running TOTP column migrations...');
    for (const sql of migrations) {
      try {
        await pool.query(sql);
      } catch (err) {
        if (err.errno === 1060) {
          // Column already exists — that's fine
        } else {
          console.warn(`  ⚠️  Migration warning: ${err.message}`);
        }
      }
    }
    console.log('✅ Migrations complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Setup Failed:', err.message);
    process.exit(1);
  }
}

setup();
