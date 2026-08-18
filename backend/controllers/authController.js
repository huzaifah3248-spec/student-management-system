const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { pool } = require("../config/db");

async function login(req, res, next) {
  try {
    const password = req.body.password;
    const identifier = req.body.identifier || req.body.username || req.body.email;

    // SECURITY FIX: Log the attempt, but NEVER log the password payload
    console.log(`[Auth] Login attempt for identifier: ${identifier || 'UNKNOWN'}`);

    if (!identifier || !password) {
      return res.status(400).json({ message: "An identifier (email/username) and password are required." });
    }

    const [rows] = await pool.execute(
      `SELECT id, username, email, password_hash, role, is_active 
       FROM users 
       WHERE (username = ? OR email = ?) AND is_active = 1 
       LIMIT 1`,
      [identifier, identifier]
    );

    if (!rows.length) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = rows[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (!process.env.JWT_SECRET) {
      console.error("[CRITICAL] JWT_SECRET is missing.");
      return res.status(500).json({ message: "Server configuration error." });
    }

    const token = jwt.sign(
      { sub: user.id, role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
    );

    return res.status(200).json({
      message: "Login successful.",
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("[Login Error]:", error.message);
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Registration endpoint disabled in production." });
    }

    const { username, email, password, role } = req.body;
    const normalizedRole = String(role || 'STUDENT').trim().toUpperCase();

    // 1. Validate inputs FIRST (Performance Optimization)
    if (!username || !email || !password) {
      return res.status(400).json({ message: "username, email, and password are required." });
    }

    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role.' });
    }

    // 2. Check Database SECOND
    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );

    if (existing.length) {
      return res.status(409).json({ message: "User with that username or email already exists." });
    }

    // 3. Hash Password LAST (Only when we are 100% sure we are saving the user)
    const passwordHash = await bcrypt.hash(password, 10);

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

module.exports = { login, register };