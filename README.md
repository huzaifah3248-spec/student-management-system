# School Management System

SRS-driven implementation for a multi-role (Admin, Teacher, Student) school management platform using **React + Bootstrap**, **Node.js/Express**, and **MySQL**.

## Implementation Status

1. **Phase 1 - Database Initialization** ✅
2. **Phase 2 - Backend Foundation** ✅
3. **Phase 3 - Frontend Foundation** ✅
4. **Phase 4 - Integration & Business Rules** ✅
5. **Phase 5 - Git Workflow & Deployment Preparation** ✅

---

## Phase 1 — Database Initialization ✅

Completed in `backend/models/schema.sql`:

- Normalized core tables: `users`, `classrooms`, `students`, `subjects`, `enrollments`, `marks`, `teacher_subject_assignments`, `admin_actions`
- Grade constraints (1–10), section constraints (1–5), roll number constraints (1–35)
- Unique student identity (`student_id`) and class-local roll uniqueness
- Seed data for all classrooms (10 grades × 5 sections, capacity 35 each) and 8 baseline subjects
- 5 triggers: capacity checks (INSERT/UPDATE), Grade 10 elective lock, auto-lock on Grade 10 insert, auto-lock on Grade 9→10 promotion
- 2 stored procedures: `sp_create_student_with_capacity_lock` (transaction-safe with pessimistic locking), `sp_admin_override_grade10_elective` (session-variable-gated override)

### Run Phase 1 in MySQL Workbench

1. Open MySQL Workbench and connect to your local server.
2. Open `backend/models/schema.sql`.
3. Execute the full script.
4. Confirm 50 classrooms and 8 subjects are seeded in `school_management_system`.

---

## Phase 2 — Backend Foundation ✅

Completed in `backend/`:

- Node.js/Express server with JSON parsing and CORS
- MySQL2 promise connection pool (`config/db.js`)
- JWT authentication (`bcryptjs` + `jsonwebtoken`)
- Role-based access control middleware (`authenticateJWT`, `requireRole`)
- API routes:
  - `POST /api/login` — unified login for all roles
  - `POST /api/register` — dev-only test endpoint (disabled in production)
  - `GET /api/users/me` — current user profile
  - `GET /api/admin/users` — list all users (admin only)
  - `POST /api/admin/users` — create user (admin only)
  - `GET /api/admin/subjects` — list subjects (admin only)
  - `GET /api/admin/teacher-subjects` — list assignments (admin only)
  - `POST /api/admin/teacher-subjects` — assign teacher to subject (admin only)
  - `POST /api/admin/override-grade10` — override locked electives with audit log (admin only)
  - `GET /api/teacher/students` — list all students (teacher/admin)
  - `GET /api/teacher/subjects` — teacher's assigned subjects
  - `GET /api/teacher/gradebook` — gradebook with marks for teacher's subjects
  - `GET /api/students` — list all students with filtering (admin/teacher)
  - `POST /api/students` — create student with capacity lock + auto-enrollment (admin only)
  - `GET /api/students/me` — student's own profile
  - `PUT /api/students/:id/elective` — update elective selection (student own, or admin override)
  - `PUT /api/students/:id/promote` — promote student to next grade (admin only)
  - `GET /api/students/:id/enrollments` — view student enrollments
  - `POST /api/enrollments` — manual enrollment (admin/teacher)
  - `POST /api/marks` — create/update marks with teacher assignment verification
  - `GET /api/marks/student/:studentId` — student marks (own only for students)
  - `GET /api/marks/my-results` — student result sheet with percentage calculations
  - `GET /api/classrooms` — list classrooms with occupancy counts
  - `GET /api/health` — health check

### Business Logic Enforced Server-Side

- **Capacity constraints**: 35 students per classroom, checked with pessimistic row locking
- **Grade 9 electives**: Students must choose Science or Arts track
- **Grade 10 electives locked**: Changes require admin override via stored procedure
- **Curriculum auto-enrollment**: Core subjects auto-assigned on student creation/promotion
- **Marks authorization**: Teachers can only enter marks for subjects they are assigned to

### Run Backend Locally

```bash
cd backend
npm install
# Ensure .env has your MySQL credentials and JWT secret
npm run dev    # uses nodemon for auto-reload
```

---

## Phase 3 & 4 — Frontend & Integration ✅

Completed in `frontend/`:

- React 18 with React Router v6
- Bootstrap 5.3.3 (loaded via CDN)
- Axios with global base URL configuration
- JWT-based auth with localStorage persistence
- Role-based route guards (`PrivateRoute` component)
- **Login page** — unified login with role-based redirect
- **Register page** — dev-only account creation
- **Admin Dashboard** — 6-tab interface:
  - Overview: stats cards, capacity visualization with progress bars
  - Users: create user form + user table with role badges
  - Students: create student form with elective logic + student listing table
  - Classrooms: all 50 classrooms with fill rates and available seats
  - Assignments: teacher-subject assignment form + assignments table
  - Tools: student promotion form + Grade 10 elective override with audit
- **Teacher Dashboard** — 3-tab interface:
  - Overview: assigned subjects list, quick stats
  - Gradebook & Marks: subject selector, marks entry form inline per student, auto-refresh
  - Students: all-students roster table
- **Student Dashboard** — 3-tab interface:
  - Profile: student details, elective info with lock status
  - My Subjects: enrollment list with codes and terms
  - Results: overall percentage stats, subject-wise marks with letter grades

### Run Frontend Locally

```bash
cd frontend
npm install
npm start    # starts on http://localhost:3000
```

---

## CORS Configuration

Default allows `http://localhost:3000`. Override with environment variable:

```bash
# Windows PowerShell
$env:FRONTEND_ORIGIN = 'http://localhost:3000'

# Unix/macOS
FRONTEND_ORIGIN='http://localhost:3000' npm run dev
```

Set `FRONTEND_ORIGIN='*'` to allow any origin (not recommended for production).

---

## Security Measures

- All passwords hashed with bcrypt (salt rounds: 10)
- JWT tokens with configurable expiry (default: 8h)
- Server-side validation on every request (never trusts client data)
- Role-based access control on all API endpoints
- Admin override actions logged to `admin_actions` table
- Grade 10 elective lock enforced at database trigger level + backend level

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Bootstrap 5.3.3, Axios, React Router v6 |
| Backend | Node.js, Express 5, MySQL2, JWT, bcryptjs |
| Database | MySQL 8.0.20+ (relational, InnoDB) |
| Future (Phase 2) | Docker, Kubernetes, AWS/Azure |

---

## Common Beginner Mistakes (Anti-Patterns) — Avoided

- **Trusting the Client**: All rules (35-student limit, elective locks, grade constraints) are enforced server-side with database triggers and stored procedures as a safety net.
- **Skipping Git**: This project is version-controlled with clear phase tracking.
- **Plaintext Passwords**: All passwords use bcrypt hashing before database storage.
