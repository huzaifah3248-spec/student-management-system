const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "identifier and password are required."
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, role, is_active
       FROM users
       WHERE (username = ? OR email = ?)
         AND is_active = 1
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid credentials."
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        username: user.username
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h"
      }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
}

// Temporary register endpoint for testing: hashes password and inserts a user.
async function register(req, res, next) {
  try {
    // Defensive check: never allow this endpoint in production
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Registration endpoint disabled in production." });
    }

    const { username, email, password, role } = req.body;
    const normalizedRole = String(role || 'STUDENT').trim().toUpperCase();

    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, and password are required." });
    }

    // Check if user exists
    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );

    if (existing.length) {
      return res.status(409).json({ message: "User with that username or email already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    if (!['ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [username, email, passwordHash, normalizedRole]
    );

    return res.status(201).json({ message: "User created for testing.", id: result.insertId });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  register
};
