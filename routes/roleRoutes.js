import express from "express";
const router = express.Router({ mergeParams: true });
import {
  getOrgRoles,
  transferOwnership,
  updateMemberRole,
} from "../controllers/roleController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";

router.use(protect);

router.get("/", requireRole("admin", "owner"), getOrgRoles);
router.patch("/transfer-ownership", requireRole("owner"), transferOwnership);
router.patch("/:userId", requireRole("admin", "owner"), updateMemberRole);

export default router;
