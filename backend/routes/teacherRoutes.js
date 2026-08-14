const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/teacher/students - list users with role STUDENT (protected: teacher and admin)
router.get('/students', authenticateJWT, requireRole(['teacher', 'admin', 'administrator', 'principal']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT s.id, s.student_id, s.first_name, s.last_name, s.grade_level, s.section_no, s.class_roll_no, u.email
       FROM students s
       JOIN users u ON u.id = s.user_id
       ORDER BY s.grade_level ASC, s.section_no ASC, s.class_roll_no ASC`
    );
    return res.json({ students: rows });
  } catch (error) {
    return next(error);
  }
});

// GET /api/teacher/subjects - subjects assigned to current teacher
router.get('/subjects', authenticateJWT, requireRole(['teacher']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(
      `SELECT tsa.id, tsa.subject_id, s.subject_code, s.subject_name, s.track
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON s.id = tsa.subject_id
       WHERE tsa.teacher_user_id = ?
       ORDER BY s.subject_name ASC`,
      [req.user.id]
    );
    return res.json({ subjects: rows });
  } catch (error) {
    return next(error);
  }
});

// GET /api/teacher/gradebook - enrollments for teacher's assigned subjects
router.get('/gradebook', authenticateJWT, requireRole(['teacher']), async (req, res, next) => {
  try {
    const subjectId = req.query.subject_id ? Number(req.query.subject_id) : null;
    if (req.query.subject_id && Number.isNaN(subjectId)) {
      return res.status(400).json({ message: 'subject_id must be numeric.' });
    }

    const whereSubject = subjectId ? 'AND e.subject_id = ?' : '';
    const params = subjectId ? [req.user.id, subjectId] : [req.user.id];

    const [rows] = await pool.execute(
      `SELECT e.id AS enrollment_id, e.academic_year, e.grade_level, e.term,
              s.subject_code, s.subject_name,
              st.id AS student_pk_id, st.student_id, st.first_name, st.last_name, st.section_no, st.class_roll_no,
              m.marks_obtained, m.max_marks
       FROM teacher_subject_assignments tsa
       JOIN subjects s ON s.id = tsa.subject_id
       JOIN enrollments e ON e.subject_id = s.id
       JOIN students st ON st.id = e.student_id
       LEFT JOIN marks m ON m.enrollment_id = e.id
       WHERE tsa.teacher_user_id = ?
       ${whereSubject}
       ORDER BY e.academic_year DESC, s.subject_name ASC, st.grade_level ASC, st.section_no ASC, st.class_roll_no ASC`,
      params
    );

    return res.json({ gradebook: rows });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
