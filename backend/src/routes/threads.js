import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  initiateThread,
  confirmCreatorPIN,
  connectThread,
  getThreadStatus,
  disconnectThread
} from '../controllers/threads.js';

const router = express.Router();

// Get status of current thread connection
router.get('/status', auth, getThreadStatus);

// Start a thread and generate a PIN (requires TOTP verification)
router.post('/initiate', auth, initiateThread);

// Confirm the generated PIN on creator's screen
router.post('/confirm', auth, confirmCreatorPIN);

// Connect a thread by typing the PIN (requires TOTP verification)
router.post('/connect', auth, connectThread);

// Disconnect/Cut the thread
router.post('/disconnect', auth, disconnectThread);

export default router;
