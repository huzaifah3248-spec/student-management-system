const express = require('express');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// Public test endpoint
router.get('/public', (req, res) => {
  res.json({ message: 'Public test endpoint - no auth required.' });
});

// Authenticated-only endpoint
router.get('/auth', authenticateJWT, (req, res) => {
  res.json({ message: 'Authenticated test endpoint', user: req.user });
});

// Role-protected endpoints
router.get('/admin', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), (req, res) => {
  res.json({ message: 'Hello Admin', user: req.user });
});

router.get('/teacher', authenticateJWT, requireRole(['teacher']), (req, res) => {
  res.json({ message: 'Hello Teacher', user: req.user });
});

router.get('/student', authenticateJWT, requireRole(['student']), (req, res) => {
  res.json({ message: 'Hello Student', user: req.user });
});

module.exports = router;
