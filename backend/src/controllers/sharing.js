import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';
import { sendGuestInviteEmail } from '../utils/email.js';

const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-secret-key-123';

/** Generate a secure random password like: Vg-Xk9#mPq2R */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const specials = '!@#$%';
  let pwd = 'Vg-';
  for (let i = 0; i < 8; i++) {
    pwd += chars[Math.floor(Math.random() * chars.length)];
  }
  pwd += specials[Math.floor(Math.random() * specials.length)];
  return pwd;
}

/** Generate a 6-digit OTP */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * POST /api/shares
 * Admin creates a new share and sends email invitation.
 */
export const createShare = async (req, res) => {
  const adminId = req.user.id;
  const {
    recipientName,
    employerName,
    recipientEmail,
    credentialIds,     // array of credential IDs to share
    permissions,       // { canViewPassword, canCopyPassword, canViewNotes }
    expiresInDays,     // e.g. 7, 30, 90
    expiresInHours,    // e.g. 1, 2, 4, 8, 12, 24
  } = req.body;

  if (!recipientName || !recipientEmail || !credentialIds?.length) {
    return res.status(400).json({ message: 'Recipient name, email, and at least one credential are required.' });
  }

  try {
    // Get admin info
    const [adminRows] = await pool.query('SELECT email FROM users WHERE id = ?', [adminId]);
    const adminEmail = adminRows[0]?.email || 'VaultGuard User';
    const adminName = adminEmail.split('@')[0];

    // Generate credentials for guest
    const tempPassword = generateTempPassword();
    const otp = generateOTP();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const expiresAt = new Date();
    if (expiresInHours) {
      expiresAt.setHours(expiresAt.getHours() + Number(expiresInHours));
    } else {
      expiresAt.setDate(expiresAt.getDate() + (Number(expiresInDays) || 30));
    }

    const otpExpiresAt = new Date();
    otpExpiresAt.setHours(otpExpiresAt.getHours() + 24);

    // Check if guest user with this email already exists
    const [existingGuest] = await pool.query('SELECT id FROM guest_users WHERE email = ?', [recipientEmail]);

    let guestUserId;
    if (existingGuest.length > 0) {
      // Update existing guest
      guestUserId = existingGuest[0].id;
      await pool.query(
        `UPDATE guest_users SET 
          created_by_user_id = ?, name = ?, employer = ?, password_hash = ?,
          setup_otp_hash = ?, otp_expires_at = ?, is_activated = FALSE, expires_at = ?
        WHERE id = ?`,
        [adminId, recipientName, employerName || null, passwordHash, otpHash, otpExpiresAt, expiresAt, guestUserId]
      );
      // Remove old shared credentials for this guest
      await pool.query('DELETE FROM shared_credentials WHERE guest_user_id = ?', [guestUserId]);
    } else {
      // Create new guest user
      const [guestResult] = await pool.query(
        `INSERT INTO guest_users 
          (created_by_user_id, name, employer, email, password_hash, setup_otp_hash, otp_expires_at, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [adminId, recipientName, employerName || null, recipientEmail, passwordHash, otpHash, otpExpiresAt, expiresAt]
      );
      guestUserId = guestResult.insertId;
    }

    // Insert shared credential permissions
    const canViewPwd = permissions?.canViewPassword ? 1 : 0;
    const canCopyPwd = permissions?.canCopyPassword ? 1 : 0;
    const canViewNotes = permissions?.canViewNotes ? 1 : 0;

    for (const credId of credentialIds) {
      await pool.query(
        `INSERT INTO shared_credentials (guest_user_id, credential_id, can_view_password, can_copy_password, can_view_notes)
         VALUES (?, ?, ?, ?, ?)`,
        [guestUserId, credId, canViewPwd, canCopyPwd, canViewNotes]
      );
    }

    // Send invitation email
    const emailStatus = await sendGuestInviteEmail({
      recipientEmail,
      recipientName,
      adminName,
      adminEmail,
      tempPassword,
      otp,
      expiresAt,
    });

    const durationStr = expiresInHours ? `${expiresInHours} hour(s)` : `${expiresInDays || 30} day(s)`;
    await logActivity(adminId, 'SHARE_CREATED', `Shared ${credentialIds.length} credential(s) with ${recipientEmail} for ${durationStr}`);

    res.status(201).json({
      message: emailStatus?.success 
        ? `Invitation email sent successfully to ${recipientEmail}` 
        : `Access granted, but email delivery was skipped/failed. You can share credentials manually.`,
      tempPassword,
      otp,
      loginUrl: `${process.env.APP_URL || 'http://localhost:5173'}/guest-login`,
      emailSent: emailStatus?.success || false,
      expiresAt
    });
  } catch (error) {
    console.error('Create share error:', error);
    res.status(500).json({ message: 'Failed to create share', error: error.message });
  }
};

/**
 * GET /api/shares
 * Admin gets list of all active shares they've created.
 */
export const getShares = async (req, res) => {
  const adminId = req.user.id;

  try {
    const [guests] = await pool.query(
      `SELECT g.id, g.name, g.employer, g.email, g.is_activated, g.expires_at, g.created_at,
              COUNT(sc.id) AS credential_count
       FROM guest_users g
       LEFT JOIN shared_credentials sc ON sc.guest_user_id = g.id
       WHERE g.created_by_user_id = ?
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [adminId]
    );
    res.json(guests);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shares', error: error.message });
  }
};

/**
 * DELETE /api/shares/:guestId
 * Admin revokes a guest's access immediately.
 */
export const revokeShare = async (req, res) => {
  const adminId = req.user.id;
  const { guestId } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM guest_users WHERE id = ? AND created_by_user_id = ?',
      [guestId, adminId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Share not found.' });
    }
    await logActivity(adminId, 'SHARE_REVOKED', { guestId });
    res.json({ message: 'Access revoked successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to revoke share', error: error.message });
  }
};

/**
 * PUT /api/shares/:guestId/extend
 * Admin extends the share expiry.
 */
export const extendShare = async (req, res) => {
  const adminId = req.user.id;
  const { guestId } = req.params;
  const { days, hours } = req.body;

  try {
    const newExpiry = new Date();
    if (hours) {
      newExpiry.setHours(newExpiry.getHours() + Number(hours));
    } else {
      newExpiry.setDate(newExpiry.getDate() + (Number(days) || 30));
    }

    await pool.query(
      'UPDATE guest_users SET expires_at = ? WHERE id = ? AND created_by_user_id = ?',
      [newExpiry, guestId, adminId]
    );
    res.json({ message: 'Access extended.', expiresAt: newExpiry });
  } catch (error) {
    res.status(500).json({ message: 'Failed to extend share', error: error.message });
  }
};

/* ─────────── GUEST AUTH ─────────── */

/**
 * POST /api/guest/login
 * Guest logs in with email + tempPassword + OTP.
 */
export const guestLogin = async (req, res) => {
  const { email, password, otp } = req.body;

  try {
    const [guests] = await pool.query(
      `SELECT * FROM guest_users WHERE email = ? AND expires_at > NOW()`,
      [email]
    );

    if (!guests.length) {
      return res.status(400).json({ message: 'No active guest account found for this email.' });
    }

    const guest = guests[0];

    // Verify password
    const passwordMatch = await bcrypt.compare(password, guest.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Verify OTP
    if (!guest.setup_otp_hash) {
      return res.status(400).json({ message: 'OTP not set. Contact the admin who shared with you.' });
    }
    if (new Date() > new Date(guest.otp_expires_at)) {
      return res.status(400).json({ message: 'OTP has expired. Ask the admin to resend the invitation.' });
    }
    const otpMatch = await bcrypt.compare(otp, guest.setup_otp_hash);
    if (!otpMatch) {
      return res.status(400).json({ message: 'Invalid OTP.' });
    }

    // Mark activated
    if (!guest.is_activated) {
      await pool.query('UPDATE guest_users SET is_activated = TRUE WHERE id = ?', [guest.id]);
    }

    // Issue guest JWT
    const token = jwt.sign(
      { guestId: guest.id, email: guest.email, isGuest: true, adminId: guest.created_by_user_id },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      guest: { id: guest.id, name: guest.name, email: guest.email, expiresAt: guest.expires_at },
    });
  } catch (error) {
    res.status(500).json({ message: 'Guest login failed', error: error.message });
  }
};

/**
 * GET /api/guest/credentials
 * Guest fetches their shared credentials list (metadata only, no encrypted data).
 */
export const guestGetCredentials = async (req, res) => {
  const { guestId } = req.user;

  try {
    // Check if guest session is still valid
    const [guests] = await pool.query(
      'SELECT * FROM guest_users WHERE id = ? AND expires_at > NOW()',
      [guestId]
    );
    if (!guests.length) return res.status(403).json({ message: 'Guest access expired.' });

    const [rows] = await pool.query(
      `SELECT 
         c.id, c.title, c.username, c.url, c.encrypted_password, c.iv, c.salt,
         c.encrypted_notes, c.encrypted_totp_secret, c.totp_iv, c.totp_salt,
         c.tags, c.is_favorite, c.created_at,
         sc.can_view_password, sc.can_copy_password, sc.can_view_notes
       FROM shared_credentials sc
       JOIN credentials c ON c.id = sc.credential_id
       WHERE sc.guest_user_id = ?`,
      [guestId]
    );

    // If can_view_password is false, strip the encrypted fields
    const sanitized = rows.map(row => {
      if (!row.can_view_password) {
        return {
          ...row,
          encrypted_password: null,
          iv: null,
          salt: null,
        };
      }
      return row;
    });

    res.json({
      credentials: sanitized,
      guestInfo: {
        name: guests[0].name,
        sharedBy: guests[0].created_by_user_id,
        expiresAt: guests[0].expires_at,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shared credentials', error: error.message });
  }
};
