const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function testDatabaseConnection() {
  try {
    const connection = await pool.getConnection();
    console.log("✅ Successfully connected to the MySQL database.");
    await connection.ping();
    connection.release();
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(`Error Code: ${error.code}`);
    console.error(`Fatal: ${error.fatal}`);
  }
}

module.exports = {
  pool,
  testDatabaseConnection
};
