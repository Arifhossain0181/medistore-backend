import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { changePassword, getDashboardStats, getProfile, updateProfile } from "./user.controller.js";
import { Router } from "express";


const router = Router();

router.get("/me", authMiddleware, getProfile);
router.get("/me/dashboard-stats", authMiddleware, getDashboardStats);
router.patch("/me",authMiddleware, updateProfile);
router.patch("/me/changed-password", authMiddleware, changePassword);

export default router;
