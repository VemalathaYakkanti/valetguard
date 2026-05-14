import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';

export const getCredentials = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query('SELECT * FROM credentials WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching credentials', error: error.message });
  }
};

export const addCredential = async (req, res) => {
  const userId = req.user.id;
  const { 
    title, url, username, encrypted_password, iv, salt, 
    encrypted_notes, folder_id, tags,
    encrypted_totp_secret, totp_iv, totp_salt 
  } = req.body;

  try {
    const [result] = await pool.query(
      `INSERT INTO credentials 
      (user_id, folder_id, title, url, username, encrypted_password, iv, salt, encrypted_notes, tags, encrypted_totp_secret, totp_iv, totp_salt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, folder_id || null, title, url, username, encrypted_password, iv, salt, 
        encrypted_notes, JSON.stringify(tags || []),
        encrypted_totp_secret || null, totp_iv || null, totp_salt || null
      ]
    );

    await logActivity(userId, 'CREDENTIAL_CREATED', { title });

    res.status(201).json({ id: result.insertId, message: 'Credential saved securely' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving credential', error: error.message });
  }
};

export const deleteCredential = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    await pool.query('DELETE FROM credentials WHERE id = ? AND user_id = ?', [id, userId]);
    
    await logActivity(userId, 'CREDENTIAL_DELETED', { id });

    res.json({ message: 'Credential deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting credential', error: error.message });
  }
};

export const updateCredential = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { 
    title, url, username, encrypted_password, iv, salt, 
    encrypted_notes, folder_id, tags,
    encrypted_totp_secret, totp_iv, totp_salt 
  } = req.body;

  try {
    const [result] = await pool.query(
      `UPDATE credentials 
      SET folder_id = ?, title = ?, url = ?, username = ?, encrypted_password = ?, iv = ?, salt = ?, encrypted_notes = ?, tags = ?,
          encrypted_totp_secret = ?, totp_iv = ?, totp_salt = ?
      WHERE id = ? AND user_id = ?`,
      [
        folder_id || null, title, url, username, encrypted_password, iv, salt, 
        encrypted_notes, JSON.stringify(tags || []),
        encrypted_totp_secret || null, totp_iv || null, totp_salt || null,
        id, userId
      ]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Credential not found or unauthorized' });
    }

    await logActivity(userId, 'CREDENTIAL_UPDATED', { title, id });

    res.json({ message: 'Credential updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating credential', error: error.message });
  }
};
