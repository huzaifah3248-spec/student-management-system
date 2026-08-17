const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT } = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/classrooms - list all classrooms with occupancy counts
router.get('/', authenticateJWT, async (req, res, next) => {
  try {
    const gradeFilter = req.query.grade ? Number(req.query.grade) : null;
    const sectionFilter = req.query.section ? Number(req.query.section) : null;

    let sql = `SELECT c.id, c.grade_level, c.section_no, c.capacity,
                      COUNT(s.id) AS enrolled
               FROM classrooms c
               LEFT JOIN students s ON s.grade_level = c.grade_level AND s.section_no = c.section_no`;
    const params = [];
    const conditions = [];

    if (gradeFilter) { 
      conditions.push('c.grade_level = ?'); 
      params.push(gradeFilter); 
    }
    if (sectionFilter) { 
      conditions.push('c.section_no = ?'); 
      params.push(sectionFilter); 
    }
    
    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' GROUP BY c.id, c.grade_level, c.section_no, c.capacity';
    sql += ' ORDER BY c.grade_level ASC, c.section_no ASC';

    const [rows] = await pool.execute(sql, params);
    return res.json({ classrooms: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;