import speakeasy from 'speakeasy';
import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';

/**
 * Generate a random 4-digit PIN code
 */
function generate4DigitPIN() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Initiate a thread (User A)
 * Requires Google Authenticator token first.
 * Generates and returns a 4-digit PIN.
 */
export const initiateThread = async (req, res) => {
  const userId = req.user.id;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ message: 'Google Authenticator code is required.' });
  }

  try {
    // 1. Get user 2FA secret
    const [users] = await pool.query('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?', [userId]);
    const user = users[0];

    if (!user || !user.two_factor_secret || !user.two_factor_enabled) {
      return res.status(400).json({ message: 'Google Authenticator must be enabled first.' });
    }

    // 2. Verify TOTP token
    const verified = speakeasy.totp.verify({
      secret: user.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid Google Authenticator code.' });
    }

    // 3. Generate random 4-digit PIN
    const pin = generate4DigitPIN();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // 5 minutes expiration

    // 4. Save/Update in thread_pins table
    await pool.query('DELETE FROM thread_pins WHERE user_id = ?', [userId]);
    await pool.query(
      'INSERT INTO thread_pins (user_id, pin, confirmed_by_creator, expires_at) VALUES (?, ?, FALSE, ?)',
      [userId, pin, expiresAt]
    );

    await logActivity(userId, 'THREAD_PIN_GENERATED', {});

    res.json({ pin, message: 'PIN generated successfully. Please enter this PIN on this screen to confirm.' });
  } catch (error) {
    console.error('Initiate thread error:', error);
    res.status(500).json({ message: 'Failed to initiate thread', error: error.message });
  }
};

/**
 * Confirm the PIN on User A's device
 */
export const confirmCreatorPIN = async (req, res) => {
  const userId = req.user.id;
  const { pin } = req.body;

  if (!pin) {
    return res.status(400).json({ message: 'PIN code is required to confirm.' });
  }

  try {
    // Look up the active, unexpired PIN for this user
    const [rows] = await pool.query(
      'SELECT * FROM thread_pins WHERE user_id = ? AND pin = ? AND expires_at > NOW()',
      [userId, pin]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired PIN. Please try again.' });
    }

    // Update confirmed state
    await pool.query('UPDATE thread_pins SET confirmed_by_creator = TRUE WHERE id = ?', [rows[0].id]);
    await logActivity(userId, 'THREAD_PIN_CONFIRMED', {});

    res.json({ message: 'PIN confirmed successfully. Waiting for B to connect...' });
  } catch (error) {
    console.error('Confirm PIN error:', error);
    res.status(500).json({ message: 'Failed to confirm PIN', error: error.message });
  }
};

/**
 * Connect to a thread (User B)
 * Requires Google Authenticator token and matching 4-digit PIN.
 */
export const connectThread = async (req, res) => {
  const userBId = req.user.id;
  const { token, pin } = req.body;

  if (!token || !pin) {
    return res.status(400).json({ message: 'Google Authenticator code and PIN are required.' });
  }

  try {
    // 1. Get User B 2FA secret
    const [users] = await pool.query('SELECT two_factor_secret, two_factor_enabled FROM users WHERE id = ?', [userBId]);
    const userB = users[0];

    if (!userB || !userB.two_factor_secret || !userB.two_factor_enabled) {
      return res.status(400).json({ message: 'Google Authenticator must be enabled first.' });
    }

    // 2. Verify User B TOTP token
    const verified = speakeasy.totp.verify({
      secret: userB.two_factor_secret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ message: 'Invalid Google Authenticator code.' });
    }

    // 3. Find confirmed, unexpired PIN matching this number
    const [pins] = await pool.query(
      'SELECT * FROM thread_pins WHERE pin = ? AND confirmed_by_creator = TRUE AND expires_at > NOW()',
      [pin]
    );

    if (pins.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired connection PIN. Ensure the other user has confirmed the PIN on their screen.' });
    }

    const userAId = pins[0].user_id;

    if (userAId === userBId) {
      return res.status(400).json({ message: 'You cannot connect a thread to yourself.' });
    }

    // 4. Establish thread connection
    // Ensure no existing thread exists to avoid duplicates
    await pool.query('DELETE FROM user_threads WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)', [userAId, userBId, userBId, userAId]);
    await pool.query(
      'INSERT INTO user_threads (user_a_id, user_b_id) VALUES (?, ?)',
      [userAId, userBId]
    );

    // Delete used pin
    await pool.query('DELETE FROM thread_pins WHERE id = ?', [pins[0].id]);

    await logActivity(userBId, 'THREAD_ESTABLISHED', { peerId: userAId });
    await logActivity(userAId, 'THREAD_ESTABLISHED', { peerId: userBId });

    res.status(201).json({ message: 'Thread established successfully!' });
  } catch (error) {
    console.error('Connect thread error:', error);
    res.status(500).json({ message: 'Failed to establish thread connection', error: error.message });
  }
};

/**
 * Fetch thread status
 */
export const getThreadStatus = async (req, res) => {
  const userId = req.user.id;

  try {
    const [threads] = await pool.query(
      `SELECT t.*, u_a.email AS email_a, u_b.email AS email_b
       FROM user_threads t
       JOIN users u_a ON u_a.id = t.user_a_id
       JOIN users u_b ON u_b.id = t.user_b_id
       WHERE t.user_a_id = ? OR t.user_b_id = ?`,
      [userId, userId]
    );

    if (threads.length === 0) {
      return res.json({ connected: false });
    }

    const thread = threads[0];
    const peerEmail = thread.user_a_id === userId ? thread.email_b : thread.email_a;

    res.json({
      connected: true,
      peerEmail,
      createdAt: thread.created_at,
    });
  } catch (error) {
    console.error('Get thread status error:', error);
    res.status(500).json({ message: 'Failed to retrieve thread connection status', error: error.message });
  }
};

/**
 * Disconnect/Cut a thread
 */
export const disconnectThread = async (req, res) => {
  const userId = req.user.id;

  try {
    // Delete any active thread containing this user ID
    const [threads] = await pool.query('SELECT * FROM user_threads WHERE user_a_id = ? OR user_b_id = ?', [userId, userId]);
    if (threads.length === 0) {
      return res.status(400).json({ message: 'No active thread connection found.' });
    }

    const thread = threads[0];
    const peerId = thread.user_a_id === userId ? thread.user_b_id : thread.user_a_id;

    await pool.query('DELETE FROM user_threads WHERE id = ?', [thread.id]);

    await logActivity(userId, 'THREAD_DISCONNECTED', { peerId });
    await logActivity(peerId, 'THREAD_DISCONNECTED', { peerId: userId });

    res.json({ message: 'Thread disconnected successfully. Connection terminated.' });
  } catch (error) {
    console.error('Disconnect thread error:', error);
    res.status(500).json({ message: 'Failed to disconnect thread', error: error.message });
  }
};
