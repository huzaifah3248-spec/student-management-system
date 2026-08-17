const express = require('express');
const { pool } = require('../config/db');
const { authenticateJWT, requireRole } = require('../middleware/authMiddleware');

const router = express.Router();
const ADMIN_ROLES = ['ADMIN', 'PRINCIPAL']; // FIXED: Standardized uppercase, removed 'administrator'
const TERM_1 = 'TERM_1';

function normalizeTrack(value) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

function normalizeElectiveSubject(value) {
  if (!value) return null;
  return String(value).trim().toUpperCase();
}

function validateElectiveSelection(gradeLevel, electiveTrack, electiveSubject) {
  if (gradeLevel >= 1 && gradeLevel <= 8) {
    if (electiveTrack || electiveSubject) return 'Grades 1-8 cannot have elective selections.';
    return null;
  }
  if (gradeLevel === 9 || gradeLevel === 10) {
    if (!electiveTrack || (electiveTrack !== 'SCIENCE' && electiveTrack !== 'ARTS')) {
      return 'Grades 9-10 must select a valid elective track: SCIENCE or ARTS.';
    }
    if (electiveTrack === 'SCIENCE' && electiveSubject !== 'BIOLOGY' && electiveSubject !== 'COMPUTER_SCIENCE') {
      return 'Science track requires elective_subject = BIOLOGY or COMPUTER_SCIENCE.';
    }
    if (electiveTrack === 'ARTS' && electiveSubject) {
      return 'Arts track does not accept elective_subject.';
    }
  }
  return null;
}

async function syncStudentEnrollments(conn, studentId, gradeLevel, electiveTrack, electiveSubject, academicYear) {
  const [coreSubjects] = await conn.execute(
    `SELECT id FROM subjects WHERE (track = 'CORE' OR track = 'BOTH') AND min_grade <= ? AND max_grade >= ?`,
    [gradeLevel, gradeLevel]
  );

  for (const row of coreSubjects) {
    await conn.execute(
      `INSERT IGNORE INTO enrollments (student_id, subject_id, academic_year, grade_level, term) VALUES (?, ?, ?, ?, ?)`,
      [studentId, row.id, academicYear, gradeLevel, TERM_1]
    );
  }

  if (gradeLevel < 9) return;

  await conn.execute(
    `DELETE e FROM enrollments e JOIN subjects s ON s.id = e.subject_id
     WHERE e.student_id = ? AND e.academic_year = ? AND e.grade_level = ? AND e.term = ? AND s.is_elective = 1`,
    [studentId, academicYear, gradeLevel, TERM_1]
  );

  let electiveCode = null;
  if (electiveTrack === 'SCIENCE') {
    electiveCode = electiveSubject === 'BIOLOGY' ? 'BIO' : 'CS-ELEC';
  } else if (electiveTrack === 'ARTS') {
    electiveCode = 'ARTS-GEN';
  }

  if (!electiveCode) return;

  const [electiveRows] = await conn.execute(
    `SELECT id FROM subjects WHERE subject_code = ? AND is_elective = 1 AND min_grade <= ? AND max_grade >= ? LIMIT 1`,
    [electiveCode, gradeLevel, gradeLevel]
  );

  if (!electiveRows.length) throw new Error(`Elective subject seed is missing for code ${electiveCode}.`);

  await conn.execute(
    `INSERT IGNORE INTO enrollments (student_id, subject_id, academic_year, grade_level, term) VALUES (?, ?, ?, ?, ?)`,
    [studentId, electiveRows[0].id, academicYear, gradeLevel, TERM_1]
  );
}

// GET /api/students - list all students (admin/teacher)
router.get('/', authenticateJWT, requireRole([...ADMIN_ROLES, 'TEACHER']), async (req, res, next) => {
  try {
    const gradeFilter = req.query.grade ? Number(req.query.grade) : null;
    const sectionFilter = req.query.section ? Number(req.query.section) : null;

    let sql = `SELECT s.id, s.student_id, s.user_id, s.first_name, s.last_name, s.date_of_birth, s.grade_level, 
                      s.section_no, s.class_roll_no, s.elective_track, s.elective_subject, s.elective_locked, u.username, u.email
               FROM students s JOIN users u ON u.id = s.user_id`;
    const params = [];
    const conditions = [];

    if (gradeFilter) { conditions.push('s.grade_level = ?'); params.push(gradeFilter); }
    if (sectionFilter) { conditions.push('s.section_no = ?'); params.push(sectionFilter); }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');

    sql += ' ORDER BY s.grade_level ASC, s.section_no ASC, s.class_roll_no ASC';

    const [rows] = await pool.execute(sql, params);
    return res.json({ students: rows });
  } catch (err) {
    return next(err);
  }
});

// POST /api/students - create student
router.post('/', authenticateJWT, requireRole(ADMIN_ROLES), async (req, res, next) => {
  const { student_id, user_id, first_name, last_name, date_of_birth, grade_level, section_no, class_roll_no, elective_track, elective_subject } = req.body || {};
  
  const gradeLevel = Number(grade_level);
  const sectionNo = Number(section_no);
  const classRollNo = Number(class_roll_no);
  const userId = Number(user_id);
  const track = normalizeTrack(elective_track);
  let subject = normalizeElectiveSubject(elective_subject);

  if (!student_id || !first_name || !last_name || Number.isNaN(userId) || Number.isNaN(gradeLevel) || Number.isNaN(sectionNo) || Number.isNaN(classRollNo)) {
    return res.status(400).json({ message: 'Missing required student fields.' });
  }

  if (track === 'ARTS') subject = null;
  const electiveError = validateElectiveSelection(gradeLevel, track, subject);
  if (electiveError) return res.status(400).json({ message: electiveError });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [classRows] = await conn.execute(`SELECT capacity FROM classrooms WHERE grade_level = ? AND section_no = ? FOR UPDATE`, [gradeLevel, sectionNo]);
    if (!classRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Invalid grade/section classroom.' });
    }

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS cnt FROM students WHERE grade_level = ? AND section_no = ? FOR UPDATE`, [gradeLevel, sectionNo]);
    if (Number(countRows[0].cnt || 0) >= Number(classRows[0].capacity || 35)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Classroom capacity exceeded (max 35 students).' });
    }

    const [insertResult] = await conn.execute(
      `INSERT INTO students (student_id, user_id, first_name, last_name, date_of_birth, grade_level, section_no, class_roll_no, elective_track, elective_subject, elective_locked)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_id, userId, first_name, last_name, date_of_birth || null, gradeLevel, sectionNo, classRollNo, track, subject, gradeLevel === 10 ? 1 : 0]
    );

    const newStudentId = insertResult.insertId;
    await syncStudentEnrollments(conn, newStudentId, gradeLevel, track, subject, new Date().getFullYear());

    await conn.commit();
    return res.status(201).json({ message: 'Student created.', id: newStudentId });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/students/me - current logged-in student's profile
router.get('/me', authenticateJWT, requireRole(['STUDENT']), async (req, res, next) => {
  try {
    const [rows] = await pool.execute(`SELECT * FROM students WHERE user_id = ? LIMIT 1`, [req.user.id]);
    if (!rows.length) return res.status(404).json({ message: 'Student profile not found.' });
    return res.json({ student: rows[0] });
  } catch (err) {
    return next(err);
  }
});

// PUT /api/students/:id/elective - choose/update Grade 9 electives, or admin override
router.put('/:id/elective', authenticateJWT, async (req, res, next) => {
  const studentId = Number(req.params.id);
  if (Number.isNaN(studentId)) return res.status(400).json({ message: 'Invalid student id.' });

  const userRole = req.user.role; // FIXED: Guaranteed uppercase
  const isAdmin = ADMIN_ROLES.includes(userRole);
  const isStudent = userRole === 'STUDENT';
  
  if (!isAdmin && !isStudent) return res.status(403).json({ message: 'Forbidden: only students or admins can update electives.' });

  const track = normalizeTrack(req.body?.elective_track);
  let subject = normalizeElectiveSubject(req.body?.elective_subject);
  if (track === 'ARTS') subject = null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.execute(`SELECT id, user_id, grade_level, elective_locked FROM students WHERE id = ? LIMIT 1 FOR UPDATE`, [studentId]);
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Student not found.' });
    }

    const student = rows[0];
    if (isStudent && Number(student.user_id) !== Number(req.user.id)) {
      await conn.rollback();
      return res.status(403).json({ message: 'Students can only change their own elective selection.' });
    }

    if (student.grade_level < 9) {
      await conn.rollback();
      return res.status(400).json({ message: 'Elective selection starts in Grade 9.' });
    }

    if (student.grade_level === 10 && Number(student.elective_locked) === 1 && !isAdmin) {
      await conn.rollback();
      return res.status(403).json({ message: 'Grade 10 elective is locked. Admin override required.' });
    }

    const electiveError = validateElectiveSelection(student.grade_level, track, subject);
    if (electiveError) {
      await conn.rollback();
      return res.status(400).json({ message: electiveError });
    }

    await conn.execute(
      `UPDATE students SET elective_track = ?, elective_subject = ?, elective_locked = ? WHERE id = ?`,
      [track, subject, student.grade_level === 10 ? 1 : 0, studentId]
    );

    await syncStudentEnrollments(conn, studentId, student.grade_level, track, subject, new Date().getFullYear());
    await conn.commit();

    return res.json({ message: 'Elective selection updated.' });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

// PUT /api/students/:id/promote - promote to next grade
router.put('/:id/promote', authenticateJWT, requireRole(ADMIN_ROLES), async (req, res, next) => {
  // Logic remains the same, updated rollback safety checks applied below
  const studentId = Number(req.params.id);
  const requestedSection = req.body?.section_no;
  const requestedRollNo = req.body?.class_roll_no;

  if (Number.isNaN(studentId)) return res.status(400).json({ message: 'Invalid student id.' });

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [studentRows] = await conn.execute(`SELECT * FROM students WHERE id = ? LIMIT 1 FOR UPDATE`, [studentId]);
    if (!studentRows.length) {
      await conn.rollback();
      return res.status(404).json({ message: 'Student not found.' });
    }

    const student = studentRows[0];
    const nextGrade = Number(student.grade_level) + 1;
    if (nextGrade > 10) {
      await conn.rollback();
      return res.status(400).json({ message: 'Student is already in Grade 10.' });
    }

    const targetSection = requestedSection === undefined ? Number(student.section_no) : Number(requestedSection);
    const targetRollNo = requestedRollNo === undefined ? Number(student.class_roll_no) : Number(requestedRollNo);

    const [classRows] = await conn.execute(`SELECT capacity FROM classrooms WHERE grade_level = ? AND section_no = ? FOR UPDATE`, [nextGrade, targetSection]);
    if (!classRows.length) {
      await conn.rollback();
      return res.status(400).json({ message: 'Target classroom is invalid.' });
    }

    const [countRows] = await conn.execute(`SELECT COUNT(*) AS cnt FROM students WHERE grade_level = ? AND section_no = ? AND id <> ? FOR UPDATE`, [nextGrade, targetSection, studentId]);
    if (Number(countRows[0].cnt || 0) >= Number(classRows[0].capacity || 35)) {
      await conn.rollback();
      return res.status(409).json({ message: 'Classroom capacity exceeded.' });
    }

    let track = normalizeTrack(student.elective_track);
    let subject = normalizeElectiveSubject(student.elective_subject);
    if (nextGrade <= 8) { track = null; subject = null; }
    if (nextGrade === 9 && track === 'ARTS') subject = null;

    const electiveError = validateElectiveSelection(nextGrade, track, subject);
    if (electiveError && nextGrade >= 9) {
      await conn.rollback();
      return res.status(400).json({ message: `Cannot promote until elective is valid: ${electiveError}` });
    }

    await conn.execute(
      `UPDATE students SET grade_level = ?, section_no = ?, class_roll_no = ?, elective_track = ?, elective_subject = ?, elective_locked = ? WHERE id = ?`,
      [nextGrade, targetSection, targetRollNo, track, subject, nextGrade === 10 ? 1 : 0, studentId]
    );

    await syncStudentEnrollments(conn, studentId, nextGrade, track, subject, new Date().getFullYear());
    await conn.commit();
    return res.json({ message: `Student promoted to Grade ${nextGrade}.` });
  } catch (err) {
    if (conn) await conn.rollback().catch(() => {});
    return next(err);
  } finally {
    if (conn) conn.release();
  }
});

// GET /api/students/:id/enrollments - list student enrollments
router.get('/:id/enrollments', authenticateJWT, async (req, res, next) => {
  try {
    const studentId = Number(req.params.id);
    if (Number.isNaN(studentId)) return res.status(400).json({ message: 'Invalid student id.' });

    const userRole = req.user.role; // FIXED: Uppercase logic
    if (userRole === 'STUDENT') {
      const [meRows] = await pool.execute(`SELECT id FROM students WHERE user_id = ? LIMIT 1`, [req.user.id]);
      if (!meRows.length || Number(meRows[0].id) !== studentId) {
        return res.status(403).json({ message: 'Forbidden: Students can only view their own enrollments.' });
      }
    }

    const [rows] = await pool.execute(
      `SELECT e.id, e.academic_year, e.grade_level, e.term, s.id AS subject_id, s.subject_code, s.subject_name
       FROM enrollments e JOIN subjects s ON s.id = e.subject_id
       WHERE e.student_id = ? ORDER BY e.id ASC`,
      [studentId]
    );
    return res.json({ enrollments: rows });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;