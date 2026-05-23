import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-secret-key-123';

export const register = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      'INSERT INTO users (email, master_password_hash) VALUES (?, ?)',
      [email, hashedPassword]
    );

    const userId = result.insertId;

    const clientType = req.body.clientType || req.headers['x-client-type'];
    const isMobile = clientType === 'mobile';

    if (isMobile) {
      const jwtToken = jwt.sign({ id: userId, email }, JWT_SECRET, { expiresIn: '8h' });
      await logActivity(userId, 'REGISTER_SUCCESS_MOBILE');
      return res.status(201).json({
        message: 'Account created successfully.',
        token: jwtToken,
        user: { id: userId, email },
      });
    }

    // Return userId so frontend can redirect to 2FA setup immediately
    res.status(201).json({
      message: 'Account created. Please set up Google Authenticator to continue.',
      userId,
      email,
      requiresTwoFactorSetup: true,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.master_password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    await logActivity(user.id, 'LOGIN_ATTEMPT', { email });

    const clientType = req.body.clientType || req.headers['x-client-type'];
    const isMobile = clientType === 'mobile';

    if (isMobile) {
      const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });
      await logActivity(user.id, 'LOGIN_SUCCESS', { method: 'PASSWORD_DIRECT_MOBILE' });
      return res.json({
        token: jwtToken,
        user: { id: user.id, email: user.email },
      });
    }

    // MANDATORY 2FA: If 2FA is not yet set up, force setup before granting access
    if (!user.two_factor_secret) {
      return res.json({
        requiresTwoFactorSetup: true,
        userId: user.id,
        email: user.email,
        message: 'Please set up Google Authenticator to complete login.',
      });
    }

    // 2FA is set up → always require TOTP verification (even if two_factor_enabled is false)
    return res.json({
      twoFactorRequired: true,
      userId: user.id,
      email: user.email,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

export const login2FA = async (req, res) => {
  const { userId, token } = req.body;

  try {
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    const user = users[0];
    if (!user) return res.status(400).json({ message: 'User not found' });
    if (!user.two_factor_secret) {
      return res.status(400).json({ message: '2FA not set up. Please set up Google Authenticator first.' });
    }

    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1, // allow 30s clock drift
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid OTP code. Please try again.' });
    }

    // Ensure two_factor_enabled is true after successful verification
    if (!user.two_factor_enabled) {
      await pool.query('UPDATE users SET two_factor_enabled = TRUE WHERE id = ?', [user.id]);
    }

    const jwtToken = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '8h' });

    await logActivity(user.id, 'LOGIN_SUCCESS', { method: '2FA_TOTP' });

    res.json({
      token: jwtToken,
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: '2FA login failed', error: error.message });
  }
};
