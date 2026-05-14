import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vaultguard-secret-key-123';

export const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header found' });
  }

  // Robustly extract token (case-insensitive "Bearer ")
  const token = authHeader.replace(/^Bearer\s+/i, '');

  if (!token || token === 'null' || token === 'undefined') {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT Auth Error:', err.message);
    res.status(401).json({ message: 'Token is not valid or has expired' });
  }
};
