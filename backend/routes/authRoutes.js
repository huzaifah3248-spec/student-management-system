const express = require("express");
const { login, register } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);

// Enable the temporary /register route only when not running in production.
if (process.env.NODE_ENV !== "production") {
  router.post("/register", register); // Temporary testing endpoint
} else {
  // In production, do not register the route. Keep a visible log for clarity.
  console.warn('POST /api/register is disabled because NODE_ENV=production');
}

module.exports = router;
