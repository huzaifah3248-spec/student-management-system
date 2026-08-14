require("dotenv").config();

const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const { testDatabaseConnection } = require("./config/db");

const app = express();

// Configure CORS to allow frontend access (use FRONTEND_ORIGIN env var to override)
const allowedOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin (e.g., curl, server-to-server)
      if (!origin) return callback(null, true);
      if (process.env.FRONTEND_ORIGIN === '*') return callback(null, true);
      if (origin === allowedOrigin) return callback(null, true);
      return callback(new Error('CORS policy: Origin not allowed'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "backend"
  });
});

app.use("/api", authRoutes);
const testRoutes = require('./routes/testRoutes');
app.use('/api/test', testRoutes);
const adminRoutes = require('./routes/adminRoutes');
app.use('/api/admin', adminRoutes);
const teacherRoutes = require('./routes/teacherRoutes');
app.use('/api/teacher', teacherRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);
// Classrooms, students, enrollments, marks
const classroomsRoutes = require('./routes/classroomsRoutes');
app.use('/api/classrooms', classroomsRoutes);
// Students, enrollments, marks
const studentsRoutes = require('./routes/studentsRoutes');
app.use('/api/students', studentsRoutes);
const enrollmentsRoutes = require('./routes/enrollmentsRoutes');
app.use('/api/enrollments', enrollmentsRoutes);
const marksRoutes = require('./routes/marksRoutes');
app.use('/api/marks', marksRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found."
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    message: "Internal server error."
  });
});

async function startServer() {
  await testDatabaseConnection();

  const port = Number(process.env.PORT || 5000);
  app.listen(port, () => {
    console.log(`Backend server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start backend server:", error);
  process.exit(1);
});