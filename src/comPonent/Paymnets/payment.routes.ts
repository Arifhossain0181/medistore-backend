import express from "express";
import {
	checkAccess,
	createCheckoutSession,
	getAllPaymentsForAdmin,
	getMyPurchasedMedicines,
	handleWebhook,
	initPayment,
	verifySession,
} from "./payment.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.post("/init", authMiddleware, initPayment);
router.post("/webhook", handleWebhook);
router.get("/verify-session", authMiddleware, verifySession);
router.get("/access/:medicineId", authMiddleware, checkAccess);
router.get("/admin/all", authMiddleware, Role(["ADMIN", "SUPER_ADMIN"]), getAllPaymentsForAdmin);
router.get("/my-purchases", authMiddleware, getMyPurchasedMedicines);

export default router;