import express from 'express';
import { auth } from '../middleware/auth.js';
import {
  createShare,
  getShares,
  revokeShare,
  extendShare,
  guestLogin,
  guestGetCredentials,
} from '../controllers/sharing.js';

const router = express.Router();

/* ─── Admin Share Management ─── */
router.get('/', auth, getShares);
router.post('/', auth, createShare);
router.delete('/:guestId', auth, revokeShare);
router.put('/:guestId/extend', auth, extendShare);

/* ─── Guest Auth ─── */
router.post('/guest/login', guestLogin);
router.get('/guest/credentials', auth, guestGetCredentials);

export default router;
