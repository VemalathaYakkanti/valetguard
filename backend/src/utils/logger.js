import { pool } from '../config/db.js';

export const logActivity = async (userId, action, details = '') => {
  try {
    await pool.query(
      'INSERT INTO activity_logs (user_id, action, details) VALUES (?, ?, ?)',
      [userId, action, typeof details === 'object' ? JSON.stringify(details) : details]
    );
    console.log(`[ACTIVITY LOG] User ${userId}: ${action}`);
  } catch (error) {
    console.error('Failed to log activity:', error.message);
  }
};
