import express from "express";
const router = express.Router({ mergeParams: true });
import {
  getOverview,
  getTasksByMember,
  getCompletionTimeline,
} from "../controllers/reportController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";

router.use(protect);

router.get("/overview", requireRole("admin", "owner"), getOverview);
router.get("/by-member", requireRole("admin", "owner"), getTasksByMember);
router.get("/timeline", requireRole("admin", "owner"), getCompletionTimeline);

export default router;
