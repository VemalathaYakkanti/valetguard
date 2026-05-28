import express from 'express';
import { getEmployees, addEmployee, updateEmployee, deleteEmployee } from '../controllers/employees.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getEmployees);
router.post('/', auth, addEmployee);
router.put('/:id', auth, updateEmployee);
router.delete('/:id', auth, deleteEmployee);

export default router;
