import express from 'express';
import { getCredentials, addCredential, deleteCredential, updateCredential, toggleFavorite } from '../controllers/credentials.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

router.get('/', auth, getCredentials);
router.post('/', auth, addCredential);
router.put('/:id', auth, updateCredential);
router.delete('/:id', auth, deleteCredential);
router.patch('/:id/favorite', auth, toggleFavorite);

export default router;
