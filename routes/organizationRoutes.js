import express from "express";
const router = express.Router();
import {
  createOrganization,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  getMembers,
  inviteMember,
  removeMember,
} from "../controllers/organizationController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";
import { inviteLimiter } from "../middlewares/rateLimiter.js";

router.use(protect);

router.post("/", createOrganization);
router.get(
  "/:orgId",
  requireRole("viewer", "member", "admin", "owner"),
  getOrganization,
);
router.patch("/:orgId", requireRole("admin", "owner"), updateOrganization);
router.delete("/:orgId", requireRole("owner"), deleteOrganization);

router.get(
  "/:orgId/members",
  requireRole("viewer", "member", "admin", "owner"),
  getMembers,
);
router.post(
  "/:orgId/members/invite",
  inviteLimiter,
  requireRole("admin", "owner"),
  inviteMember,
);
router.delete(
  "/:orgId/members/:userId",
  requireRole("admin", "owner"),
  removeMember,
);

export default router;
