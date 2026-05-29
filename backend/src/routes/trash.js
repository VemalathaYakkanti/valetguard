import express from 'express';
import { pool } from '../config/db.js';
import { auth } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// GET /api/trash - Retrieve all soft-deleted items
router.get('/', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [credentials] = await pool.query(
      'SELECT id, title, username, url, created_at FROM credentials WHERE user_id = ? AND is_deleted = 1 ORDER BY created_at DESC',
      [userId]
    );
    const [folders] = await pool.query(
      'SELECT id, name, slug, icon FROM folders WHERE user_id = ? AND is_deleted = 1',
      [userId]
    );
    const [files] = await pool.query(
      'SELECT id, folder_slug, name, type, size, created_at, updated_at FROM folder_files WHERE user_id = ? AND is_deleted = 1 ORDER BY updated_at DESC',
      [userId]
    );
    res.json({ credentials, folders, files });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch trash items', error: error.message });
  }
});

// PUT /api/trash/restore/:type/:id - Restore a soft-deleted item
router.put('/restore/:type/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { type, id } = req.params;

  try {
    if (type === 'credential') {
      await pool.query('UPDATE credentials SET is_deleted = 0 WHERE id = ? AND user_id = ?', [id, userId]);
      await logActivity(userId, 'CREDENTIAL_RESTORED', { id });
    } else if (type === 'folder') {
      // Restore folder and its files
      const [folder] = await pool.query('SELECT slug FROM folders WHERE id = ? AND user_id = ?', [id, userId]);
      if (folder.length > 0) {
        const slug = folder[0].slug;
        await pool.query('UPDATE folders SET is_deleted = 0 WHERE id = ? AND user_id = ?', [id, userId]);
        await pool.query('UPDATE folder_files SET is_deleted = 0 WHERE folder_slug = ? AND user_id = ?', [slug, userId]);
      }
      await logActivity(userId, 'FOLDER_RESTORED', { id });
    } else if (type === 'file') {
      await pool.query('UPDATE folder_files SET is_deleted = 0 WHERE id = ? AND user_id = ?', [id, userId]);
      await logActivity(userId, 'DOCUMENT_RESTORED', { id });
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
    res.json({ message: 'Item restored successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restore item', error: error.message });
  }
});

// DELETE /api/trash/purge/:type/:id - Permanently delete an item
router.delete('/purge/:type/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { type, id } = req.params;

  try {
    if (type === 'credential') {
      await pool.query('DELETE FROM credentials WHERE id = ? AND user_id = ?', [id, userId]);
      await logActivity(userId, 'CREDENTIAL_PURGED', { id });
    } else if (type === 'folder') {
      const [folder] = await pool.query('SELECT slug FROM folders WHERE id = ? AND user_id = ?', [id, userId]);
      if (folder.length > 0) {
        const slug = folder[0].slug;
        await pool.query('DELETE FROM folders WHERE id = ? AND user_id = ?', [id, userId]);
        await pool.query('DELETE FROM folder_files WHERE folder_slug = ? AND user_id = ?', [slug, userId]);
      }
      await logActivity(userId, 'FOLDER_PURGED', { id });
    } else if (type === 'file') {
      await pool.query('DELETE FROM folder_files WHERE id = ? AND user_id = ?', [id, userId]);
      await logActivity(userId, 'DOCUMENT_PURGED', { id });
    } else {
      return res.status(400).json({ message: 'Invalid type' });
    }
    res.json({ message: 'Item purged permanently' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to purge item', error: error.message });
  }
});

export default router;
