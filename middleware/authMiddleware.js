const jwt = require('jsonwebtoken');

// Middleware for authentication
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];  // Extract token from 'Bearer <token>'

  if (!token) return res.status(401).json({ error: 'Unauthorized, no token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;  // Attach decoded user information to the request
    next();
  } catch (error) {
    console.error("Token Error:", error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;
