const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/marks - create or update marks for an enrollment
router.post('/', authenticateJWT, requireRole(['TEACHER', 'ADMIN', 'PRINCIPAL']), async (req, res, next) => {
  const { enrollment_id, marks_obtained, max_marks } = req.body || {};
  
  if (!enrollment_id || marks_obtained === undefined || max_marks === undefined) {
    return res.status(400).json({ message: 'enrollment_id, marks_obtained, and max_marks are required.' });
  }

  const marksObtained = Number(marks_obtained);
  const maxMarks = Number(max_marks);
  
  if (Number.isNaN(marksObtained) || Number.isNaN(maxMarks) || marksObtained < 0 || maxMarks <= 0 || marksObtained > maxMarks) {
    return res.status(400).json({ message: 'Invalid marks range.' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Verify enrollment exists
    const [eRows] = await conn.execute(
      `SELECT e.id, e.student_id, e.subject_id FROM enrollments e WHERE e.id = ? LIMIT 1 FOR UPDATE`,
      [enrollment_id]
    );
    
    if (!eRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Enrollment not found.' });
    }

    // 2. Strict Teacher Verification (If not Admin/Principal)
    const userRole = req.user.role; // Now guaranteed uppercase by authMiddleware
    if (userRole === 'TEACHER') {
      const [assignmentRows] = await conn.execute(
        `SELECT id FROM teacher_subject_assignments WHERE teacher_user_id = ? AND subject_id = ? LIMIT 1`,
        [req.user.id, eRows[0].subject_id]
      );
      if (!assignmentRows.length) {
        await conn.rollback();
        return res.status(403).json({ message: 'Forbidden: You are not assigned to grade this subject.' });
      }
    }

    // 3. Upsert Logic
    const [existing] = await conn.execute(`SELECT id FROM marks WHERE enrollment_id = ? LIMIT 1`, [enrollment_id]);
    if (existing.length) {
      await conn.execute(
        `UPDATE marks SET marks_obtained = ?, max_marks = ?, graded_by_user_id = ? WHERE enrollment_id = ?`,
        [marksObtained, maxMarks, req.user.id, enrollment_id]
      );
      await conn.commit();
      return res.json({ message: 'Marks updated successfully.' });
    }

    await conn.execute(
      `INSERT INTO marks (enrollment_id, marks_obtained, max_marks, graded_by_user_id) VALUES (?, ?, ?, ?)`,
      [enrollment_id, marksObtained, maxMarks, req.user.id]
    );
    await conn.commit();
    return res.status(201).json({ message: 'Marks recorded successfully.' });
    
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/marks/student/:studentId - get marks for a student
router.get('/student/:studentId', authenticateJWT, async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (Number.isNaN(studentId)) return res.status(400).json({ message: 'Invalid student id.' });

    // Restrict Students to their own records
    const userRole = req.user.role;
    if (userRole === 'STUDENT') {
      const [studentRows] = await pool.execute(`SELECT id FROM students WHERE user_id = ? LIMIT 1`, [req.user.id]);
      if (!studentRows.length || Number(studentRows[0].id) !== studentId) {
        return res.status(403).json({ message: 'Forbidden: Students can only view their own marks.' });
      }
    }

    const [rows] = await pool.execute(
      `SELECT m.id, m.marks_obtained, m.max_marks, m.created_at, m.updated_at, s.subject_code, s.subject_name
       FROM marks m
       JOIN enrollments e ON e.id = m.enrollment_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE e.student_id = ?`,
      [studentId]
    );

    return res.json({ marks: rows });
  } catch (err) {
    return next(err);
  }
});

// GET /api/marks/my-results - student's own final result sheet
router.get('/my-results', authenticateJWT, requireRole(['STUDENT']), async (req, res, next) => {
  try {
    const [studentRows] = await pool.execute(
      `SELECT id, first_name, last_name, grade_level, section_no FROM students WHERE user_id = ? LIMIT 1`,
      [req.user.id]
    );

    if (!studentRows.length) return res.status(404).json({ message: 'Student profile not found.' });
    const student = studentRows[0];

    const [rows] = await pool.execute(
      `SELECT s.subject_code, s.subject_name, e.academic_year, e.term, m.marks_obtained, m.max_marks,
              ROUND((m.marks_obtained / NULLIF(m.max_marks, 0)) * 100, 2) AS percentage
       FROM marks m
       JOIN enrollments e ON e.id = m.enrollment_id
       JOIN subjects s ON s.id = e.subject_id
       WHERE e.student_id = ?
       ORDER BY e.academic_year DESC, e.term DESC, s.subject_name ASC`,
      [student.id]
    );

    let totalObtained = 0;
    let totalMax = 0;
    for (const row of rows) {
      totalObtained += Number(row.marks_obtained || 0);
      totalMax += Number(row.max_marks || 0);
    }

    const overallPercentage = totalMax > 0 ? Number(((totalObtained / totalMax) * 100).toFixed(2)) : 0;
    
    return res.json({
      student,
      result: { total_obtained: totalObtained, total_max: totalMax, overall_percentage: overallPercentage },
      marks: rows
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;