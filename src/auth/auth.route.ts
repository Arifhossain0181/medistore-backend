import { Router } from "express";
import { login, logout, me, register } from "./auth.controller.js";
import { authMiddleware } from "./middleware/auth.middleware.js";

const router = Router()

router.post("/register",register)
router.post("/login",login);
router.post("/logout", logout);
router.get("/me", me);
export default router;