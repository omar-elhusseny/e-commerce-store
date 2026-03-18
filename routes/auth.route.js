const express = require('express');
const router = express.Router();
const { loginUserValidation, registerUserValidation, resetPasswordValidation } = require("../middleware/validator/authValidator")
const { register, verifyEmail, login, forgetPassword, verifyResetCode, resetPassword } = require("../controllers/auth.controller")
const { allowedTo } = require("../middleware/allowTo");
const isAuth = require("../middleware/isAuth");
const refreshAccessToken = require('../utils/refreshToken');

// POST /api/v1/auth/register
router.post("/register", registerUserValidation, register)

// GET /api/v1/auth/verify-email
router.get("/verify-email/:token", verifyEmail)

// POST /api/v1/auth/login
router.post("/login", loginUserValidation, login)

// POST /api/v1/auth/forget-password
router.post('/forgot-password', forgetPassword);

// POST /api/v1/auth/verify-reset-code
router.post('/verify-reset-code', verifyResetCode);

// POST /api/v1/auth/reset-password
router.post('/reset-password', resetPasswordValidation, resetPassword);

// POST /api/v1/auth/refresh-token
router.post("/refresh-token", isAuth, allowedTo, refreshAccessToken)

module.exports = router;