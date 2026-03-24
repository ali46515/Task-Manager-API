import express from "express";
const router = express.Router({ mergeParams: true });
import {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  archiveTask,
} from "../controllers/taskController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { requireRole } from "../middlewares/rbacMiddleware.js";

router.use(protect);

router
  .route("/")
  .get(requireRole("viewer", "member", "admin", "owner"), getTasks)
  .post(requireRole("member", "admin", "owner"), createTask);

router
  .route("/:taskId")
  .get(requireRole("viewer", "member", "admin", "owner"), getTask)
  .patch(requireRole("member", "admin", "owner"), updateTask)
  .delete(requireRole("admin", "owner"), deleteTask);

router.patch("/:taskId/archive", requireRole("admin", "owner"), archiveTask);

export default router;
