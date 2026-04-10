import { Router } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { orderController } from "./order.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";

const router = Router();

// Seller routes (must be above dynamic "/:id")
router.get("/seller/orders", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), orderController.getsellerOrders);
router.patch("/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), orderController.updateOrderStatus);
router.patch("/:id/status", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), orderController.updateOrderStatus);

// Admin routes
router.get("/admin/all", authMiddleware, Role(["ADMIN", "SUPER_ADMIN"]), orderController.allOrders);

// Customer routes
router.post("/", authMiddleware, Role(["CUSTOMER"]), orderController.createOrder);
router.get("/", authMiddleware, Role(["CUSTOMER"]), orderController.myOrders);
router.get("/:id", authMiddleware, Role(["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN", "DELIVERY_MAN"]), orderController.getsingleOrder);

export default router;
