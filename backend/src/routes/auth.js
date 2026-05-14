import express from 'express';
import { body, validationResult } from 'express-validator';
import { register, login, login2FA } from '../controllers/auth.js';

const router = express.Router();

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

router.post('/register', [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  validate
], register);

router.post('/login', [
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], login);

router.post('/verify-otp', [
  body('userId').notEmpty(),
  body('token').isLength({ min: 6, max: 6 }),
  validate
], login2FA);

export default router;
