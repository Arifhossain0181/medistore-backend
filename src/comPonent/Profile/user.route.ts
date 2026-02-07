import { changePassword, updateProfile } from "./user.controller.js";
import { Router } from "express";

const router = Router();

router.patch("/me", updateProfile);
router.patch("/me/changed-password", changePassword);

export default router;
