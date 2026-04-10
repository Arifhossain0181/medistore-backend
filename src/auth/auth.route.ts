import { Router } from "express";
import { applyDeliveryMan, login, logout, me, register } from "./auth.controller.js";

const router = Router()

router.post("/register",register)
router.post("/apply-delivery-man", applyDeliveryMan)
router.post("/login",login);
router.post("/logout", logout);
router.get("/me", me);
export default router;