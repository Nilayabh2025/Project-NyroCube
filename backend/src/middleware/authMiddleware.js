const { verifyToken } = require('../utils/jwt');

async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication token is missing.' });
    }

    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      fullName: payload.fullName
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication failed.' });
  }
}

module.exports = { requireAuth };
