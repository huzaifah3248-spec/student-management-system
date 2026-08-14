const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/admin/users - list users (protected: admin only)
router.get('/users', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, role, is_active
       FROM users
       ORDER BY id DESC`
    );
    return res.json({ users: rows });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/users - create a new user (protected: admin only)
router.post('/users', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password || !role) {
      return res.status(400).json({ message: 'username, email, password and role are required.' });
    }
    const normalizedRole = String(role).trim().toUpperCase();
    if (!['ADMIN', 'PRINCIPAL', 'TEACHER', 'STUDENT'].includes(normalizedRole)) {
      return res.status(400).json({ message: 'role must be ADMIN, PRINCIPAL, TEACHER, or STUDENT.' });
    }

    // Check duplicates
    const [existing] = await pool.execute(
      `SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1`,
      [username, email]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'User with that username or email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [username, email, passwordHash, normalizedRole]
    );

    return res.status(201).json({ message: 'User created.', id: result.insertId });
  } catch (error) {
    return next(error);
  }
});

// POST /api/admin/teacher-subjects - assign subject to teacher
router.post('/teacher-subjects', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const teacherUserId = Number(req.body?.teacher_user_id);
    const subjectId = Number(req.body?.subject_id);

    if (Number.isNaN(teacherUserId) || Number.isNaN(subjectId)) {
      return res.status(400).json({ message: 'teacher_user_id and subject_id must be numeric.' });
    }

    const [teacherRows] = await pool.execute(
      `SELECT id, role FROM users WHERE id = ? LIMIT 1`,
      [teacherUserId]
    );
    if (!teacherRows.length) return res.status(404).json({ message: 'Teacher user not found.' });
    if (String(teacherRows[0].role || '').toUpperCase() !== 'TEACHER') {
      return res.status(400).json({ message: 'Selected user is not a teacher.' });
    }

    const [subjectRows] = await pool.execute(
      `SELECT id FROM subjects WHERE id = ? LIMIT 1`,
      [subjectId]
    );
    if (!subjectRows.length) return res.status(404).json({ message: 'Subject not found.' });

    await pool.execute(
      `INSERT IGNORE INTO teacher_subject_assignments (teacher_user_id, subject_id)
       VALUES (?, ?)`,
      [teacherUserId, subjectId]
    );

    return res.status(201).json({ message: 'Teacher subject assignment saved.' });
  } catch (error) {
    return next(error);
  }
});

// GET /api/admin/teacher-subjects - list all teacher-subject assignments
router.get('/teacher-subjects', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT tsa.id, tsa.teacher_user_id, tsa.subject_id,
              u.username AS teacher_username, u.email AS teacher_email,
              s.subject_code, s.subject_name
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

// GET /api/admin/subjects - list subjects for admin forms
router.get('/subjects', authenticateJWT, requireRole(['admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, subject_code, subject_name, is_elective, track, min_grade, max_grade
       FROM subjects
       ORDER BY subject_name ASC`
    );
    return res.json({ subjects: rows });
  } catch (error) {
    return next(error);
  }
});


// POST /api/admin/override-grade10 - Admin override for locked Grade 10 elective
router.post('/override-grade10', authenticateJWT, requireRole(['admin','administrator','principal']), async (req, res, next) => {
  const { student_id, track, subject } = req.body || {};
  if (!student_id || !track) return res.status(400).json({ message: 'student_id and track are required.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Ensure student exists and is Grade 10
    const [sRows] = await conn.execute(`SELECT id, grade_level FROM students WHERE id = ? LIMIT 1 FOR UPDATE`, [student_id]);
    if (!sRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Student not found.' });
    }
    const student = sRows[0];
    if (student.grade_level !== 10) {
      await conn.rollback();
      return res.status(400).json({ message: 'Admin override only applicable to Grade 10 students.' });
    }

    // Call stored procedure (defined in schema.sql) to perform admin override safely
    await conn.query(`CALL sp_admin_override_grade10_elective(?, ?, ?)`, [student_id, track, subject || null]);

    await conn.execute(
      `INSERT INTO admin_actions (admin_user_id, student_id, action, details) VALUES (?, ?, ?, ?)`,
      [req.user.id, student_id, 'override_grade10_elective', JSON.stringify({ track, subject })]
    );

    await conn.commit();
    return res.json({ message: 'Admin override applied.' });
  } catch (err) {
    try { await conn.rollback(); } catch (e) {}
    if (err && err.sqlMessage) {
      return next(err);
    }
    return next(err);
  } finally {
    conn.release();
  }
});

module.exports = router;
