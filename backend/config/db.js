const mysql = require('mysql2/promise');
require('dotenv').config();

// 1. Connection Pool Initialization
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'school_management_system',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// 2. Strict Database Connection Tester
async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log(' Successfully connected to the MySQL database.');
    connection.release(); //  Return connection to the pool immediately
  } catch (error) {
    console.error(' Database connection failed:', error.message);
    throw error; 
  }
}

module.exports = { pool, testDatabaseConnection };