import { pool } from '../config/db.js';

export const getSpreadsheets = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query('SELECT * FROM spreadsheets WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching spreadsheets', error: error.message });
  }
};

export const saveSpreadsheet = async (req, res) => {
  const userId = req.user.id;
  const { name, data } = req.body;

  try {
    // Check if it's an update or new
    if (req.body.id) {
      await pool.query('UPDATE spreadsheets SET name = ?, data = ? WHERE id = ? AND user_id = ?', 
        [name, JSON.stringify(data), req.body.id, userId]);
      res.json({ message: 'Spreadsheet updated' });
    } else {
      const [result] = await pool.query('INSERT INTO spreadsheets (user_id, name, data) VALUES (?, ?, ?)', 
        [userId, name, JSON.stringify(data)]);
      res.status(201).json({ id: result.insertId, message: 'Spreadsheet created' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error saving spreadsheet', error: error.message });
  }
};

export const deleteSpreadsheet = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM spreadsheets WHERE id = ? AND user_id = ?', [id, userId]);
    res.json({ message: 'Spreadsheet deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting spreadsheet', error: error.message });
  }
};
