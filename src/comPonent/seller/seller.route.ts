import { Router } from "express";
import { createMedicine, updateMedicine, deleteMedicine } from "../medicine/mdecine.conrtoller.js";
import { orderController } from "../Order/order.controller.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";

const router = Router();

// Seller Medicine Management
router.post("/medicines", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), createMedicine);
router.put("/medicines/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), updateMedicine);
router.delete("/medicines/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), deleteMedicine);

// Seller Order Management
router.get("/orders", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), orderController.getsellerOrders);
router.patch("/orders/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), orderController.updateOrderStatus);

export default router;
