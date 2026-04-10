import express from 'express';
const router = express.Router();
import { loginUserValidation, registerUserValidation, resetPasswordValidation } from "../middleware/validator/authValidator.js"
import { register, verifyEmail, login, forgetPassword, verifyResetCode, resetPassword, reactivateAccount } from "../controllers/auth.controller.js"
import refreshAccessToken from '../utils/refreshToken.js';

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
router.post("/refresh-token", refreshAccessToken)

// POST /api/v1/auth/reactivate
router.post('/reactivate', reactivateAccount);

export default router;