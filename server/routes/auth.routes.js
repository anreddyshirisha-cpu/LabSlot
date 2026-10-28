const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const db = require('../db/dbAdapter');
const { authenticate } = require('../middleware/auth');

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.full_name
    },
    config.JWT_SECRET,
    { expiresIn: config.SESSION_EXPIRY }
  );
}

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required.',
        code: 'VALIDATION_ERROR'
      });
    }

    const user = await db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User with this email does not exist.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Incorrect password provided.',
        code: 'INVALID_CREDENTIALS'
      });
    }

    const token = createToken(user);
    const { password_hash, ...safeUser } = user;

    await db.logAudit(user.id, 'USER_LOGIN', 'users', user.id, { email: user.email }, req.ip);

    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Signed in as ${user.full_name} (${user.role.toUpperCase()})`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name, department, qualification_level } = req.body;

    if (!email || !password || !full_name || !department) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, full name, and department are required.',
        code: 'VALIDATION_ERROR'
      });
    }

    const existing = await db.getUserByEmail(email);
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An account with this email address is already registered.',
        code: 'EMAIL_ALREADY_EXISTS'
      });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = await db.createUser({
      email: email.toLowerCase().trim(),
      password_hash,
      full_name: full_name.trim(),
      department: department.trim(),
      role: 'student',
      qualification_level: qualification_level || 'Level 1 Trainee'
    });

    const token = createToken(user);
    const { password_hash: _, ...safeUser } = user;

    await db.logAudit(user.id, 'USER_REGISTERED', 'users', user.id, { email: user.email }, req.ip);

    res.status(201).json({
      success: true,
      token,
      user: safeUser,
      message: 'Researcher account successfully created.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { password_hash, ...safeUser } = req.user;
    res.json({
      success: true,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/switch-demo-role
// Quick evaluator switch for instant testing of all 4 roles
router.post('/switch-demo-role', async (req, res, next) => {
  try {
    const { role } = req.body;
    const roleMap = {
      admin: 'admin@labhub.edu',
      operator: 'operator@labhub.edu',
      student: 'student@labhub.edu',
      scholar: 'scholar@labhub.edu'
    };

    const targetEmail = roleMap[role];
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        error: 'Invalid demo role. Options: admin, operator, student, scholar',
        code: 'INVALID_ROLE'
      });
    }

    const user = await db.getUserByEmail(targetEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Demo user not found' });
    }

    const token = createToken(user);
    const { password_hash, ...safeUser } = user;

    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Active demo persona switched to: ${user.full_name} [${user.role.toUpperCase()}]`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
