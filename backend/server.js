console.log(" CHECKPOINT 1: Server file started. Reading .env...");
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { testDatabaseConnection } = require('./config/db');

console.log(" CHECKPOINT 2: Importing Routes...");
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const teacherRoutes = require('./routes/teacherRoutes');
const userRoutes = require('./routes/userRoutes');
const classroomsRoutes = require('./routes/classroomsRoutes');
const studentsRoutes = require('./routes/studentsRoutes');
const enrollmentsRoutes = require('./routes/enrollmentsRoutes');
const marksRoutes = require('./routes/marksRoutes');

console.log(" CHECKPOINT 3: Routes imported. Configuring Express...");
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://192.168.1.7:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10kb' })); 

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// API Routes
app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/users', userRoutes);
app.use('/api/classrooms', classroomsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/marks', marksRoutes);

// 404 Fallback Handler (FIXED: No asterisk used here)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.path}:`, err.message);
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error.' 
  });
});

console.log(" CHECKPOINT 4: Middleware configured. Preparing to boot...");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  console.log(" CHECKPOINT 5: startServer() executing...");
  try {
    await testDatabaseConnection();
    console.log(" CHECKPOINT 6: Database connected. Opening port...");
    app.listen(PORT, () => {
      console.log(` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error(' Database connection failed. Server shutting down.', error);
    process.exit(1);
  }
};

startServer();