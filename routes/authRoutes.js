import express from "express";

const router = express.Router();

import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

// Public
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.patch("/reset-password/:token", authLimiter, resetPassword);

// Private
router.post("/logout", protect, logout);

module.exports = router;
