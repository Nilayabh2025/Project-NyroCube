const bcrypt = require('bcryptjs');
const { signUserToken } = require('../utils/jwt');

async function signup(req, res, next) {
  try {
    const db = req.app.get('db');
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      return res.status(400).json({ message: 'fullName, email and password are required.' });
    }

    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', email.toLowerCase());
    if (existingUser) {
      return res.status(409).json({ message: 'An account already exists with this email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.run(
      'INSERT INTO users (full_name, email, password_hash) VALUES (?, ?, ?)',
      fullName,
      email.toLowerCase(),
      passwordHash
    );

    const user = await db.get('SELECT id, full_name, email FROM users WHERE id = ?', result.lastID);
    const token = signUserToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const db = req.app.get('db');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase());
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const token = signUserToken(user);
    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
}

async function profile(req, res, next) {
  try {
    const db = req.app.get('db');
    const user = await db.get(
      'SELECT id, full_name, email, created_at FROM users WHERE id = ?',
      req.user.id
    );

    res.json({ user });
  } catch (error) {
    next(error);
  }
}

module.exports = { signup, login, profile };
