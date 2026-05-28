import { pool } from '../config/db.js';
import { logActivity } from '../utils/logger.js';

/** Get all employees for the logged-in user */
export const getEmployees = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, company_name, role, created_at FROM employees WHERE user_id = ? ORDER BY name ASC',
      [userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching employees', error: error.message });
  }
};

/** Add a new employee */
export const addEmployee = async (req, res) => {
  const userId = req.user.id;
  const { name, email, company_name, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  try {
    // Check if email already exists for this user
    const [existing] = await pool.query(
      'SELECT id FROM employees WHERE user_id = ? AND email = ?',
      [userId, email]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'An employee with this email already exists.' });
    }

    const [result] = await pool.query(
      'INSERT INTO employees (user_id, name, email, company_name, role) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email, company_name || null, role || null]
    );

    await logActivity(userId, 'EMPLOYEE_CREATED', { name, email });
    res.status(201).json({
      id: result.insertId,
      message: 'Employee added successfully.',
      employee: { id: result.insertId, name, email, company_name, role }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding employee', error: error.message });
  }
};

/** Update employee details */
export const updateEmployee = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { name, email, company_name, role } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: 'Name and email are required.' });
  }

  try {
    // Check email uniqueness excluding current employee
    const [existing] = await pool.query(
      'SELECT id FROM employees WHERE user_id = ? AND email = ? AND id != ?',
      [userId, email, id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ message: 'Another employee with this email already exists.' });
    }

    const [result] = await pool.query(
      'UPDATE employees SET name = ?, email = ?, company_name = ?, role = ? WHERE id = ? AND user_id = ?',
      [name, email, company_name || null, role || null, id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found or unauthorized.' });
    }

    await logActivity(userId, 'EMPLOYEE_UPDATED', { name, email, id });
    res.json({ message: 'Employee updated successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error updating employee', error: error.message });
  }
};

/** Delete an employee */
export const deleteEmployee = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const [result] = await pool.query(
      'DELETE FROM employees WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found or unauthorized.' });
    }

    await logActivity(userId, 'EMPLOYEE_DELETED', { id });
    res.json({ message: 'Employee deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting employee', error: error.message });
  }
};
