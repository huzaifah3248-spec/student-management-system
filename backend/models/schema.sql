-- School Management System - Phase 1 (Database Initialization)


CREATE DATABASE IF NOT EXISTS school_management_system
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE school_management_system;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(120) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'TEACHER', 'STUDENT') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS classrooms (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  grade_level TINYINT UNSIGNED NOT NULL,
  section_no TINYINT UNSIGNED NOT NULL,
  capacity TINYINT UNSIGNED NOT NULL DEFAULT 35,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_classrooms_grade CHECK (grade_level BETWEEN 1 AND 10),
  CONSTRAINT chk_classrooms_section CHECK (section_no BETWEEN 1 AND 5),
  CONSTRAINT chk_classrooms_capacity CHECK (capacity = 35),
  UNIQUE KEY uq_classrooms_grade_section (grade_level, section_no)
) ENGINE=InnoDB;


-- 3. STUDENTS TABLE

CREATE TABLE IF NOT EXISTS students (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(20) NOT NULL UNIQUE,
  user_id BIGINT UNSIGNED NOT NULL UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  date_of_birth DATE,
  grade_level TINYINT UNSIGNED NOT NULL,
  section_no TINYINT UNSIGNED NOT NULL,
  class_roll_no TINYINT UNSIGNED NOT NULL,
  elective_track ENUM('SCIENCE', 'ARTS') DEFAULT NULL,
  elective_subject ENUM('BIOLOGY', 'COMPUTER_SCIENCE') DEFAULT NULL,
  elective_locked TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_students_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_students_classroom FOREIGN KEY (grade_level, section_no)
    REFERENCES classrooms(grade_level, section_no),
  CONSTRAINT chk_students_grade CHECK (grade_level BETWEEN 1 AND 10),
  CONSTRAINT chk_students_section CHECK (section_no BETWEEN 1 AND 5),
  CONSTRAINT chk_students_roll CHECK (class_roll_no BETWEEN 1 AND 35),
 
  CONSTRAINT chk_students_electives_by_grade CHECK (
    (grade_level BETWEEN 1 AND 8 AND elective_track IS NULL AND elective_subject IS NULL)
    OR
    (grade_level = 9
     AND elective_track IS NOT NULL
     AND (elective_track = 'ARTS' OR elective_subject IS NOT NULL)
    )
    OR
    (grade_level = 10
     AND elective_track IS NOT NULL
     AND (elective_track = 'ARTS' OR elective_subject IS NOT NULL)
     AND elective_locked = 1
    )
  ),
  UNIQUE KEY uq_students_class_roll (grade_level, section_no, class_roll_no)
) ENGINE=InnoDB;


-- 4. SUBJECTS TABLE

CREATE TABLE IF NOT EXISTS subjects (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  subject_code VARCHAR(30) NOT NULL UNIQUE,
  subject_name VARCHAR(100) NOT NULL UNIQUE,
  is_elective TINYINT(1) NOT NULL DEFAULT 0,
  track ENUM('CORE', 'SCIENCE', 'ARTS', 'BOTH') NOT NULL DEFAULT 'CORE',
  min_grade TINYINT UNSIGNED NOT NULL,
  max_grade TINYINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_subjects_grade_range CHECK (
    min_grade BETWEEN 1 AND 10
    AND max_grade BETWEEN 1 AND 10
    AND min_grade <= max_grade
  )
) ENGINE=InnoDB;

-- 5. ENROLLMENTS TABLE
CREATE TABLE IF NOT EXISTS enrollments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  academic_year YEAR NOT NULL,
  grade_level TINYINT UNSIGNED NOT NULL,
  term ENUM('TERM_1', 'TERM_2', 'FINAL') NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_subject FOREIGN KEY (subject_id) REFERENCES subjects(id),
  CONSTRAINT chk_enrollments_grade CHECK (grade_level BETWEEN 1 AND 10),
  UNIQUE KEY uq_enrollment_unique (student_id, subject_id, academic_year, term)
) ENGINE=InnoDB;

-- 6. MARKS TABLE
CREATE TABLE IF NOT EXISTS marks (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  enrollment_id BIGINT UNSIGNED NOT NULL,
  marks_obtained DECIMAL(5,2) NOT NULL,
  max_marks DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  graded_by_user_id BIGINT UNSIGNED DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_marks_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollments(id) ON DELETE CASCADE,
  CONSTRAINT fk_marks_graded_by FOREIGN KEY (graded_by_user_id) REFERENCES users(id),
  CONSTRAINT chk_marks_range CHECK (
    marks_obtained >= 0 AND max_marks > 0 AND marks_obtained <= max_marks
  ),
  UNIQUE KEY uq_marks_enrollment (enrollment_id)
) ENGINE=InnoDB;

-- 7. TEACHER SUBJECT ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS teacher_subject_assignments (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  teacher_user_id BIGINT UNSIGNED NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tsa_teacher FOREIGN KEY (teacher_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_tsa_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE KEY uq_tsa_teacher_subject (teacher_user_id, subject_id)
) ENGINE=InnoDB;

-- 8. ADMIN ACTION AUDIT TABLE
CREATE TABLE IF NOT EXISTS admin_actions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  admin_user_id BIGINT UNSIGNED NOT NULL,
  student_id BIGINT UNSIGNED NOT NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_actions_user FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_admin_actions_student FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- SEED DATA
INSERT INTO classrooms (grade_level, section_no, capacity)
SELECT g.grade_level, s.section_no, 35
FROM (
  SELECT 1 AS grade_level UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
  UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
) AS g,
(
  SELECT 1 AS section_no UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
) AS s
ON DUPLICATE KEY UPDATE capacity = VALUES(capacity);

INSERT INTO subjects (subject_code, subject_name, is_elective, track, min_grade, max_grade) VALUES
  ('URDU',     'Urdu',                          0, 'CORE',    1, 10),
  ('MATH',     'Mathematics',                   0, 'CORE',    1, 10),
  ('SCI',      'Science',                       0, 'CORE',    1,  8),
  ('CS',       'Computer Science',              0, 'CORE',    1,  8),
  ('ENG',      'English',                       0, 'CORE',    1, 10),
  ('BIO',      'Biology',                       1, 'SCIENCE', 9, 10),
  ('CS-ELEC',  'Computer Science (Elective)',   1, 'SCIENCE', 9, 10),
  ('ARTS-GEN', 'Arts General Studies',          1, 'ARTS',    9, 10)
ON DUPLICATE KEY UPDATE
  subject_name   = VALUES(subject_name),
  is_elective    = VALUES(is_elective),
  track          = VALUES(track),
  min_grade      = VALUES(min_grade),
  max_grade      = VALUES(max_grade);

-- TRIGGERS
DELIMITER $$

-- TRIGGER A: Capacity check on INSERT
DROP TRIGGER IF EXISTS trg_students_capacity_before_insert$$
CREATE TRIGGER trg_students_capacity_before_insert
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
  DECLARE classroom_count INT;
  SELECT COUNT(*) INTO classroom_count
  FROM students
  WHERE grade_level = NEW.grade_level
    AND section_no = NEW.section_no;

  IF classroom_count >= 35 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Classroom capacity exceeded (max 35 students).';
  END IF;
END$$

-- TRIGGER B: Capacity check on UPDATE (room change)
DROP TRIGGER IF EXISTS trg_students_capacity_before_update$$
CREATE TRIGGER trg_students_capacity_before_update
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
  DECLARE classroom_count INT;

  IF (OLD.grade_level <> NEW.grade_level OR OLD.section_no <> NEW.section_no) THEN
    SELECT COUNT(*) INTO classroom_count
    FROM students
    WHERE grade_level = NEW.grade_level
      AND section_no = NEW.section_no;

    IF classroom_count >= 35 THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Classroom capacity exceeded (max 35 students).';
    END IF;
  END IF;
END$$

-- TRIGGER C: Grade 10 elective lock
DROP TRIGGER IF EXISTS trg_students_grade10_lock$$
CREATE TRIGGER trg_students_grade10_lock
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
  IF COALESCE(@admin_override, 0) = 0 THEN
    SET @admin_override = 0;
  END IF;

  IF OLD.grade_level = 10
     AND OLD.elective_locked = 1
     AND (
       NOT (NEW.elective_track <=> OLD.elective_track)
       OR NOT (NEW.elective_subject <=> OLD.elective_subject)
     )
     AND COALESCE(@admin_override, 0) = 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Grade 10 electives are locked. Admin override required.';
  END IF;
END$$

-- TRIGGER D (NEW): Auto-lock electives on Grade 10 INSERT

DROP TRIGGER IF EXISTS trg_students_auto_lock_grade10_insert$$
CREATE TRIGGER trg_students_auto_lock_grade10_insert
BEFORE INSERT ON students
FOR EACH ROW
BEGIN
  IF NEW.grade_level = 10 AND NEW.elective_locked = 0 THEN
    SET NEW.elective_locked = 1;
  END IF;
END$$

-- TRIGGER E (NEW): Auto-lock electives on Grade 9to10 promotion

DROP TRIGGER IF EXISTS trg_students_auto_lock_grade10_promotion$$
CREATE TRIGGER trg_students_auto_lock_grade10_promotion
BEFORE UPDATE ON students
FOR EACH ROW
BEGIN
  IF OLD.grade_level = 9
     AND NEW.grade_level = 10
     AND NEW.elective_locked = 0 THEN
    SET NEW.elective_locked = 1;
  END IF;
END$$

-- STORED PROCEDURES

-- PROCEDURE 1: Admin override for Grade 10 electives
DROP PROCEDURE IF EXISTS sp_admin_override_grade10_elective$$
CREATE PROCEDURE sp_admin_override_grade10_elective (
  IN p_student_id BIGINT UNSIGNED,
  IN p_track VARCHAR(20),
  IN p_subject VARCHAR(30)
)
BEGIN
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    SET @admin_override = 0;
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_track NOT IN ('SCIENCE', 'ARTS') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid elective track value.';
  END IF;

  IF p_track = 'SCIENCE' AND p_subject NOT IN ('BIOLOGY', 'COMPUTER_SCIENCE') THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Invalid elective subject value.';
  END IF;

  START TRANSACTION;
    SET @admin_override = 1;
    UPDATE students
    SET elective_track   = p_track,
        elective_subject = p_subject,
        elective_locked  = 1
    WHERE id = p_student_id
      AND grade_level = 10;
    SET @admin_override = 0;
  COMMIT;
END$$

-- PROCEDURE 2: Create student with capacity lock
DROP PROCEDURE IF EXISTS sp_create_student_with_capacity_lock$$
CREATE PROCEDURE sp_create_student_with_capacity_lock (
  IN p_student_id VARCHAR(20),
  IN p_user_id BIGINT UNSIGNED,
  IN p_first_name VARCHAR(100),
  IN p_last_name VARCHAR(100),
  IN p_date_of_birth DATE,
  IN p_grade_level TINYINT UNSIGNED,
  IN p_section_no TINYINT UNSIGNED,
  IN p_class_roll_no TINYINT UNSIGNED,
  IN p_elective_track VARCHAR(20),
  IN p_elective_subject VARCHAR(30)
)
BEGIN
  DECLARE v_capacity INT;
  DECLARE v_current_count INT;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  IF p_grade_level BETWEEN 1 AND 8 THEN
    IF p_elective_track IS NOT NULL OR p_elective_subject IS NOT NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Grades 1-8 cannot have electives.';
    END IF;
  END IF;

  IF p_grade_level IN (9, 10) THEN
    IF p_elective_track IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Grades 9-10 must have an elective track.';
    END IF;
    IF p_elective_track = 'SCIENCE' AND p_elective_subject IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Science track students must choose Biology or Computer Science.';
    END IF;
  END IF;

  START TRANSACTION;

    SELECT capacity INTO v_capacity
    FROM classrooms
    WHERE grade_level = p_grade_level
      AND section_no = p_section_no
    FOR UPDATE;

    IF v_capacity IS NULL THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid grade/section classroom.';
    END IF;

    -- Count current students 
    SELECT COUNT(*) INTO v_current_count
    FROM students
    WHERE grade_level = p_grade_level
      AND section_no = p_section_no
    FOR UPDATE;

    IF v_current_count >= v_capacity THEN
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Classroom capacity exceeded (max 35 students).';
    END IF;

    -- FIX #3: elective_locked is now auto-set by trigger D for Grade 10.
    INSERT INTO students (
      student_id,
      user_id,
      first_name,
      last_name,
      date_of_birth,
      grade_level,
      section_no,
      class_roll_no,
      elective_track,
      elective_subject,
      elective_locked
    ) VALUES (
      p_student_id,
      p_user_id,
      p_first_name,
      p_last_name,
      p_date_of_birth,
      p_grade_level,
      p_section_no,
      p_class_roll_no,
      p_elective_track,
      p_elective_subject,
      0   
    );

  COMMIT;
END$$

DELIMITER ;
