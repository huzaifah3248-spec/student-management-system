const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/users/me - return current user's profile based on JWT
router.get('/me', authenticateJWT, async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Authentication required.' });

    const [rows] = await pool.execute(
      `SELECT id, username, email, role, is_active
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ message: 'User not found.' });
    return res.json({ user: rows[0] });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
