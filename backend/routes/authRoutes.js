const express = require("express");
const { login, register } = require("../controllers/authController");

const router = express.Router();

router.post("/login", login);

if (process.env.NODE_ENV !== "production") {
  router.post("/register", register); // Temporary testing endpoint
} else {

  console.warn('POST /api/register is disabled because NODE_ENV=production');
}

module.exports = router;
