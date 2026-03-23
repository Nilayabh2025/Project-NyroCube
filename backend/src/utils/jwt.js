const jwt = require('jsonwebtoken');
const env = require('../config/env');

function signUserToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      fullName: user.full_name
    },
    env.jwtSecret,
    { expiresIn: '12h' }
  );
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

module.exports = { signUserToken, verifyToken };
