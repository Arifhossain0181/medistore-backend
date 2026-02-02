import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { changePassword, updateProfile } from "./user.controller.js";

const router = require('express').Router();

router.patch("/me", authMiddleware, updateProfile);
router.patch("/me/changed-password", authMiddleware, changePassword);

export default router;
