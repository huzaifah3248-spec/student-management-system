const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/enrollments - enroll a student in a subject
router.post('/', authenticateJWT, requireRole(['admin','administrator','principal','teacher']), async (req, res, next) => {
  const { student_id, subject_id, academic_year, grade_level, term } = req.body || {};
  if (!student_id || !subject_id || !academic_year || !grade_level || !term) {
    return res.status(400).json({ message: 'student_id, subject_id, academic_year, grade_level and term are required.' });
  }

  try {
    // Verify student exists
    const [sRows] = await pool.execute(`SELECT id, grade_level FROM students WHERE id = ? LIMIT 1`, [student_id]);
    if (!sRows.length) return res.status(404).json({ message: 'Student not found.' });

    const student = sRows[0];

    // Basic validation: do not allow electives for grades 1-8
    if (student.grade_level >=1 && student.grade_level <=8) {
      return res.status(400).json({ message: 'Grades 1-8 have fixed core curriculum; do not enroll electives manually.' });
    }

    // Create enrollment (unique constraint exists)
    const [result] = await pool.execute(
      `INSERT INTO enrollments (student_id, subject_id, academic_year, grade_level, term)
       VALUES (?, ?, ?, ?, ?)`,
      [student_id, subject_id, academic_year, grade_level, term]
    );

    return res.status(201).json({ message: 'Enrollment created.', id: result.insertId });
  } catch (err) {
    if (err && err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Student is already enrolled in that subject for the given year/term.' });
    }
    return next(err);
  }
});

module.exports = router;
