import { pool } from '../src/config/db.js';

async function clearDatabase() {
  console.log('🚀 Starting database cleanup...');
  
  const tables = [
    'shared_credentials',
    'guest_users',
    'credentials',
    'folders',
    'activity_logs',
    'spreadsheets',
    'folder_files',
    'users'
  ];

  try {
    // Disable foreign key checks to allow truncating tables with dependencies
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    
    for (const table of tables) {
      console.log(`🧹 Clearing table: ${table}...`);
      await pool.query(`TRUNCATE TABLE ${table}`);
    }
    
    // Re-enable foreign key checks
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    
    console.log('✅ All data cleared successfully! Your database is now fresh.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to clear database:', err.message);
    // Try to re-enable foreign key checks even on failure
    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (e) {}
    process.exit(1);
  }
}

clearDatabase();
