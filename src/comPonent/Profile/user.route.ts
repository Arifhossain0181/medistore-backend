import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { updateProfile } from "./user.controller.js";

const router = require('express').Router();

router.patch("/me", authMiddleware, updateProfile);

export default router;
