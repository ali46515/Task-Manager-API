import express from "express";

const router = express.Router();

import {
  register,
  login,
  forgotPassword,
  resetPassword,
  logout,
} from "../controllers/authController.js";
import {
  getMe,
  rejectMember,
  approveMember,
  getPendingMembers,
  createInvite,
} from "../controllers/js";
import { protect } from "../middlewares/authMiddleware.js";
import { authLimiter } from "../middlewares/rateLimiter.js";

// Public
router.post("/register", authLimiter, register);
// Register via invite token
router.post("/register-via-invite", authLimiter, registerViaInvite);
router.post("/login", authLimiter, login);
router.post("/forgot-password", authLimiter, forgotPassword);
router.patch("/reset-password/:token", authLimiter, resetPassword);

// Private
router.post("/logout", protect, logout);
router.get("/me", protect, getMe);
router.get(
  "/orgs/:orgId/members/pending",
  protect,
  requireRole("admin", "owner"),
  getPendingMembers,
);

router.patch(
  "/orgs/:orgId/members/:userId/approve",
  protect,
  requireRole("admin", "owner"),
  approveMember,
);

router.patch(
  "/orgs/:orgId/members/:userId/reject",
  protect,
  requireRole("admin", "owner"),
  rejectMember,
);

router.post(
  "/orgs/:orgId/members/invite",
  inviteLimiter,
  protect,
  requireRole("admin", "owner"),
  createInvite,
);

export default router;
