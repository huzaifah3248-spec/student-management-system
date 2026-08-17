const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/admin/users - list users
router.get('/users', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, role, is_active FROM users ORDER BY id DESC`
    );
    return res.json({ users: rows });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/users - create a new user
router.post('/users', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    
    // 1. Strict Input Validation
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'Username, email, password, and role are required.' });
    }

    const normalizedRole = String(role).trim().toUpperCase();
    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'Invalid role assignment.' });
    }

    // 2. Prevent Duplicates
    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'User with that username or email already exists.' });
    }

    // 3. Hash Password & Insert
    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 1)`,
      [username, email, passwordHash, normalizedRole]
    );

    return res.status(201).json({ message: 'User created.', id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

// PUT /api/admin/users/:id - update a user by ID
router.put('/users/:id', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { username, email, role, is_active } = req.body;

    // 1. Strict Input Validation (Fixing the crash vulnerability)
    if (!username || !email || !role || is_active === undefined) {
      return res.status(400).json({ message: 'All fields (username, email, role, is_active) are required.' });
    }

    const [result] = await pool.execute(
      `UPDATE users SET username = ?, email = ?, role = ?, is_active = ? WHERE id = ?`,
      [username, email, role.toUpperCase(), is_active, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    return next(error);
  }
});

// DELETE /api/admin/users/:id - delete a user by ID
router.delete('/users/:id', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Prevent self-deletion
    if (Number(userId) === Number(req.user?.sub || req.user?.id)) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }

    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/teacher-subjects - assign subject to teacher
router.post('/teacher-subjects', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const teacherUserId = Number(req.body?.teacher_user_id);
    const subjectId = Number(req.body?.subject_id);

    if (Number.isNaN(teacherUserId) || Number.isNaN(subjectId) || teacherUserId === 0 || subjectId === 0) {
      return res.status(400).json({ message: 'Valid teacher_user_id and subject_id are required.' });
    }

    const [teacherRows] = await pool.execute(`SELECT id, role FROM users WHERE id = ? LIMIT 1`, [teacherUserId]);
    if (!teacherRows.length || String(teacherRows[0].role).toUpperCase() !== 'TEACHER') {
      return res.status(400).json({ message: 'Valid Teacher user not found.' });
    }

    const [subjectRows] = await pool.execute(`SELECT id FROM subjects WHERE id = ? LIMIT 1`, [subjectId]);
    if (!subjectRows.length) return res.status(404).json({ message: 'Subject not found.' });

    await pool.execute(
      `INSERT IGNORE INTO teacher_subject_assignments (teacher_user_id, subject_id) VALUES (?, ?)`,
      [teacherUserId, subjectId]
    );

    return res.status(201).json({ message: 'Teacher subject assignment saved.' });
  } catch (error) {
    return next(error);
  }
});

// GET /api/admin/teacher-subjects - list all teacher-subject assignments
router.get('/teacher-subjects', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT tsa.id, tsa.teacher_user_id, tsa.subject_id, u.username AS teacher_username, 
              u.email AS teacher_email, s.subject_code, s.subject_name
       FROM teacher_subject_assignments tsa
       JOIN users u ON u.id = tsa.teacher_user_id
       JOIN subjects s ON s.id = tsa.subject_id
       ORDER BY u.username ASC, s.subject_name ASC`
    );
    return res.json({ assignments: rows });
  } catch (error) {
    return next(error);
  }
});

// GET /api/admin/subjects - list subjects
router.get('/subjects', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM subjects ORDER BY subject_name ASC`);
    return res.json({ subjects: rows });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/override-grade10 - Admin override for locked Grade 10 elective
router.post('/override-grade10', authenticateJWT, requireRole(['admin']), async (req, res, next) => {
  const { student_id, track, subject } = req.body || {};
  if (!student_id || !track) return res.status(400).json({ message: 'student_id and track are required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [sRows] = await conn.execute(`SELECT id, grade_level FROM students WHERE id = ? LIMIT 1 FOR UPDATE`, [student_id]);
    if (!sRows.length || sRows[0].grade_level !== 10) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid student or not in Grade 10.' });
    }

    await conn.query(`CALL sp_admin_override_grade10_elective(?, ?, ?)`, [student_id, track, subject || null]);
    
    await conn.execute(
      `INSERT INTO admin_actions (admin_user_id, student_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user.id || req.user.sub, student_id, 'override_grade10_elective', JSON.stringify({ track, subject })]
    );

    await conn.commit();
    return res.json({ message: 'Admin override applied.' });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;