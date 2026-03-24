import express from "express";
const router = express.Router({ mergeParams: true });
import {
  getNotifications,
  markAllAsRead,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";

router.use(protect);

router.get(
  "/",
  requireRole("viewer", "member", "admin", "owner"),
  getNotifications,
);
router.patch(
  "/read-all",
  requireRole("viewer", "member", "admin", "owner"),
  markAllAsRead,
);
router.patch(
  "/:notifId/read",
  requireRole("viewer", "member", "admin", "owner"),
  markAsRead,
);
router.delete(
  "/:notifId",
  requireRole("viewer", "member", "admin", "owner"),
  deleteNotification,
);

export default router;
