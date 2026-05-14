import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';

/**
 * Setup 2FA — generates a new secret and QR code.
 * Works for both initial setup (unauthenticated via userId) and re-enrollment (authenticated).
 */
export const setup2FA = async (req, res) => {
  // Support both authenticated (req.user.id) and unauthenticated setup (req.body.userId)
  const userId = req.user?.id || req.body?.userId;
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    const [users] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
    if (!users.length) return res.status(404).json({ message: 'User not found' });

    const secret = speakeasy.generateSecret({
      name: `VaultGuard (${users[0].email})`,
      issuer: 'VaultGuard',
    });

    // Store the new secret (not yet enabled — only enabled after verify)
    await pool.query(
      'UPDATE users SET two_factor_secret = ?, two_factor_enabled = FALSE WHERE id = ?',
      [secret.base32, userId]
    );

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
    res.json({ qrCode: qrCodeUrl, secret: secret.base32 });
  } catch (error) {
    res.status(500).json({ message: 'Error setting up 2FA', error: error.message });
  }
};

/**
 * Verify & enable 2FA after scanning QR code.
 * Accepts userId in body for the post-registration flow (no JWT yet).
 */
export const verify2FA = async (req, res) => {
  const userId = req.user?.id || req.body?.userId;
  const { token } = req.body;
  if (!userId) return res.status(400).json({ message: 'User ID required' });

  try {
    const [users] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    const user = users[0];
    if (!user?.two_factor_secret) return res.status(400).json({ message: '2FA not initiated. Call /setup first.' });

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = ?', [userId]);
    await logActivity(userId, '2FA_ENABLED', {});

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Verification failed', error: error.message });
  }
};

/**
 * Reset 2FA — verify current TOTP first, then wipe old secret.
 * A new setup flow must follow this call.
 */
export const reset2FA = async (req, res) => {
  const userId = req.user.id;
  const { currentToken } = req.body;

  try {
    const [users] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    const user = users[0];
    if (!user?.two_factor_secret) return res.status(400).json({ message: '2FA is not set up.' });

    // Must verify current TOTP before resetting
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: currentToken,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Current OTP is incorrect. Reset denied.' });
    }

    // Wipe old secret — user must now go through setup again
    await pool.query(
      'UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = ?',
      [userId]
    );
    await logActivity(userId, '2FA_RESET', {});

    res.json({ message: '2FA reset successful. Please scan new QR code.' });
  } catch (error) {
    res.status(500).json({ message: 'Reset failed', error: error.message });
  }
};

/**
 * Disable 2FA completely — requires current TOTP as proof.
 * (Only used internally; UI enforces mandatory 2FA so this is an admin override.)
 */
export const disable2FA = async (req, res) => {
  const userId = req.user.id;
  const { currentToken } = req.body;

  try {
    const [users] = await pool.query('SELECT two_factor_secret FROM users WHERE id = ?', [userId]);
    const user = users[0];

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token: currentToken,
      window: 1,
    });

    if (!verified) return res.status(400).json({ message: 'Invalid OTP. Cannot disable 2FA.' });

    await pool.query('UPDATE users SET two_factor_secret = NULL, two_factor_enabled = FALSE WHERE id = ?', [userId]);
    await logActivity(userId, '2FA_DISABLED', {});

    res.json({ message: '2FA disabled.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to disable 2FA', error: error.message });
  }
};
