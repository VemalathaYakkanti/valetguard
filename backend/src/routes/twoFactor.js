import express from 'express';
import { setup2FA, verify2FA, reset2FA, disable2FA } from '../controllers/twoFactor.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Initial setup — works with or without JWT (post-registration needs userId in body)
router.post('/setup', setup2FA);

// Verify OTP and enable 2FA — works with or without JWT
router.post('/verify', verify2FA);

// Reset authenticator (switch to new device/person) — requires valid JWT + current TOTP
router.post('/reset', auth, reset2FA);

// Disable 2FA — requires valid JWT + current TOTP
router.post('/disable', auth, disable2FA);

export default router;
