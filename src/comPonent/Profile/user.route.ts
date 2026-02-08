import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { changePassword, updateProfile } from "./user.controller.js";
import { Router } from "express";


const router = Router();

router.patch("/me",authMiddleware, updateProfile);
router.patch("/me/changed-password", authMiddleware, changePassword);

export default router;
