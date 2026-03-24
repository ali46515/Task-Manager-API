import express from "express";
const router = express.Router({ mergeParams: true });
import {
  getAuditLogs,
  getAuditLogById,
} from "../controllers/auditLogController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";

router.use(protect);

router.get("/", requireRole("admin", "owner"), getAuditLogs);
router.get("/:logId", requireRole("admin", "owner"), getAuditLogById);

export default router;
