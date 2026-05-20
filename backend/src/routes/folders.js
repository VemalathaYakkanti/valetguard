import express from 'express';
import { pool } from '../config/db.js';
import { auth } from '../middleware/auth.js';
import { logActivity } from '../utils/logger.js';

const router = express.Router();

// Starter seed files to pre-fill SQL layer automatically
const STARTER_SEEDS = {
  work: [
    { name: 'Q3_Project_Plan.docx', type: 'word', size: '1.2 MB', content: 'Quarterly Strategic Execution Plan for engineering deliverables.' },
    { name: 'Financial_Forecast_2026.xlsx', type: 'excel', size: '480 KB', content: 'Budget matrices and operating cost run rates.' },
    { name: 'Server_Access_Notes.txt', type: 'text', size: '12 KB', content: 'Production SSH Bastion Host IP: 192.168.1.50\nEnsure hardware Token is connected before requesting tunnel authorization.' }
  ],
  personal: [
    { name: 'Insurance_Policy.pdf', type: 'pdf', size: '2.5 MB', content: 'Comprehensive Health & Property indemnity summary.' },
    { name: 'Grocery_List.txt', type: 'text', size: '1 KB', content: '- Organic Almond Milk\n- Avocados\n- Greek Yogurt\n- Espresso Beans' }
  ],
  banking: [
    { name: 'Wire_Transfer_Instructions.pdf', type: 'pdf', size: '920 KB', content: 'Routing Number: 021000021\nSWIFT BIC: CHASEUS33\nBeneficiary: VaultGuard Secure LLC' }
  ]
};

/**
 * GET /api/folders/all
 * Retrieve all folders and their files for the authenticated user.
 * Used for populating Share Modal.
 */
router.get('/all', auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [folders] = await pool.query('SELECT id, name, slug, icon FROM folders WHERE user_id = ?', [userId]);
    const [files] = await pool.query('SELECT id, folder_slug, name, type, size, created_at, updated_at FROM folder_files WHERE user_id = ? ORDER BY updated_at DESC', [userId]);
    res.json({ folders, files });
  } catch (error) {
    console.error('Folders all GET error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve all folders and files', error: error.message });
  }
});

/**
 * GET /api/folders/:slug/files
 * Retrieve all files inside a folder slug. Auto-seeds defaults if empty.
 */
router.get('/:slug/files', auth, async (req, res) => {
  const userId = req.user.id;
  const { slug } = req.params;

  try {
    // 1. Ensure folder entity exists
    let [folderRows] = await pool.query('SELECT * FROM folders WHERE user_id = ? AND slug = ?', [userId, slug]);
    if (folderRows.length === 0) {
      const folderName = slug.charAt(0).toUpperCase() + slug.slice(1);
      const [insertRes] = await pool.query(
        'INSERT INTO folders (user_id, name, slug, icon) VALUES (?, ?, ?, ?)',
        [userId, folderName, slug, 'folder']
      );
      // fetch back
      const [newRows] = await pool.query('SELECT * FROM folders WHERE id = ?', [insertRes.insertId]);
      folderRows = newRows;
    }

    // 2. Query folder files
    const [fileRows] = await pool.query(
      'SELECT * FROM folder_files WHERE user_id = ? AND folder_slug = ? ORDER BY updated_at DESC',
      [userId, slug]
    );

    // 3. If zero files and it is a standard slug, seed defaults
    if (fileRows.length === 0 && STARTER_SEEDS[slug]) {
      console.log(`🌱 Auto-seeding starter documents for folder: ${slug}`);
      const seeds = STARTER_SEEDS[slug];
      for (const item of seeds) {
        await pool.query(
          'INSERT INTO folder_files (folder_slug, user_id, name, type, size, content) VALUES (?, ?, ?, ?, ?, ?)',
          [slug, userId, item.name, item.type, item.size, item.content]
        );
      }
      // Re-query newly inserted files
      const [seededRows] = await pool.query(
        'SELECT * FROM folder_files WHERE user_id = ? AND folder_slug = ? ORDER BY updated_at DESC',
        [userId, slug]
      );
      return res.json(seededRows);
    }

    res.json(fileRows);
  } catch (error) {
    console.error('Folder Files GET error:', error.message);
    res.status(500).json({ message: 'Failed to retrieve folder contents', error: error.message });
  }
});

/**
 * POST /api/folders/:slug/files
 * Create a new document in the folder.
 */
router.post('/:slug/files', auth, async (req, res) => {
  const userId = req.user.id;
  const { slug } = req.params;
  const { name, type, size, content } = req.body;

  try {
    const [result] = await pool.query(
      'INSERT INTO folder_files (folder_slug, user_id, name, type, size, content) VALUES (?, ?, ?, ?, ?, ?)',
      [slug, userId, name, type, size || '1 KB', content || '']
    );

    const [newDoc] = await pool.query('SELECT * FROM folder_files WHERE id = ?', [result.insertId]);
    await logActivity(userId, 'DOCUMENT_CREATED', `Created ${type} document "${name}" in folder "${slug}"`);
    res.status(201).json(newDoc[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create document', error: error.message });
  }
});

/**
 * PUT /api/folders/files/:id
 * Update file contents/size (Notepad edit support).
 */
router.put('/files/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { content, size } = req.body;

  try {
    // verify ownership
    const [check] = await pool.query('SELECT name, folder_slug FROM folder_files WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) return res.status(404).json({ message: 'Document not found' });

    await pool.query(
      'UPDATE folder_files SET content = ?, size = ? WHERE id = ? AND user_id = ?',
      [content, size || '1 KB', id, userId]
    );

    const [updated] = await pool.query('SELECT * FROM folder_files WHERE id = ?', [id]);
    await logActivity(userId, 'DOCUMENT_UPDATED', `Updated content of "${check[0].name}" in folder "${check[0].folder_slug}"`);
    res.json(updated[0]);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update document', error: error.message });
  }
});

/**
 * DELETE /api/folders/files/:id
 * Delete document.
 */
router.delete('/files/:id', auth, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [check] = await pool.query('SELECT name FROM folder_files WHERE id = ? AND user_id = ?', [id, userId]);
    if (check.length === 0) return res.status(404).json({ message: 'Document not found' });

    await pool.query('DELETE FROM folder_files WHERE id = ? AND user_id = ?', [id, userId]);
    await logActivity(userId, 'DOCUMENT_DELETED', `Deleted document "${check[0].name}"`);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete document', error: error.message });
  }
});

export default router;
