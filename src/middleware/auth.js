const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errorHandler');

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return next(new UnauthorizedError('Authentication token missing'));
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!decoded.tenantId || !decoded.userId) {
      return next(new UnauthorizedError('Invalid token payload'));
    }

    req.user = {
      id: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role || 'member'
    };
    req.tenantId = decoded.tenantId;

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Token has expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
}

module.exports = { authMiddleware, JWT_SECRET };
