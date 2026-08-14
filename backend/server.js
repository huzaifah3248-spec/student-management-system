require("dotenv").config();

const cors = require("cors");
const express = require("express");
const authRoutes = require("./routes/authRoutes");
const { testDatabaseConnection } = require("./config/db");
const app = express();
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Enable JSON body parsing for incoming requests
app.use(express.json());

// Configure CORS to allow frontend access (use FRONTEND_ORIGIN env var to override)
// 1. Define an array of all permitted client URLs
const allowedOrigins = [
    'http://localhost:3000',
    'http://192.168.1.6:3000'
];

app.use(
  cors({
    origin: allowedOrigins,
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