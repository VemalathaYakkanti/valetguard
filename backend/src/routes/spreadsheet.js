import express from 'express';
import { getSpreadsheets, saveSpreadsheet, deleteSpreadsheet } from '../controllers/spreadsheet.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getSpreadsheets);
router.post('/', auth, saveSpreadsheet);
router.delete('/:id', auth, deleteSpreadsheet);

export default router;
