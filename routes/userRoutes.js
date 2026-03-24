import express from "express";

const router = express.Router();

import { getMe, deleteMe, updateMe } from "../controllers/userController.js";
import { protect } from "../middlewares/authMiddleware.js";

router.use(protect);

router.route("/me").get(getMe).patch(updateMe).delete(deleteMe);

export default router;
