import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { pool } from './config/db.js';
import authRoutes from './routes/auth.js';
import credentialRoutes from './routes/credentials.js';
import twoFactorRoutes from './routes/twoFactor.js';
import spreadsheetRoutes from './routes/spreadsheet.js';
import activityRoutes from './routes/activity.js';
import sharingRoutes from './routes/sharing.js';
import foldersRoutes from './routes/folders.js';
import employeeRoutes from './routes/employees.js';
import threadsRoutes from './routes/threads.js';

// Force restart and reload updated .env config
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-secret-key-123';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/credentials', credentialRoutes);
app.use('/api/2fa', twoFactorRoutes);
app.use('/api/spreadsheets', spreadsheetRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/shares', sharingRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/threads', threadsRoutes);


// Dedicated guest auth endpoint (no JWT required)
app.post('/api/guest/login', async (req, res) => {
  const { default: router } = await import('./routes/sharing.js');
  // handled inside sharing controller directly
  res.status(404).json({ message: 'Use POST /api/shares/guest/login' });
});

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as connected');
    res.json({
      status: 'ok',
      message: 'VaultGuard Backend is running',
      database: 'connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Backend running, but DB connection failed',
      error: error.message,
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  VaultGuard Backend running on port ${PORT}`);
});
