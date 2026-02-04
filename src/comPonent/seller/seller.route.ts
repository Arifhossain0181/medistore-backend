import { Router } from "express";
import { createMedicine, updateMedicine, deleteMedicine } from "../medicine/mdecine.conrtoller.js";
import { orderController } from "../Order/order.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";

const router = Router();

// Seller Medicine Management
router.post("/medicines", authMiddleware, Role(["SELLER"]), createMedicine);
router.put("/medicines/:id", authMiddleware, Role(["SELLER"]), updateMedicine);
router.delete("/medicines/:id", authMiddleware, Role(["SELLER"]), deleteMedicine);

// Seller Order Management
router.get("/orders", authMiddleware, Role(["SELLER"]), orderController.getsellerOrders);
router.patch("/orders/:id", authMiddleware, Role(["SELLER"]), orderController.updateOrderStatus);

export default router;
