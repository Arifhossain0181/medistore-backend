import { Router } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { orderController } from "./order.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";

const router = Router();

// Customer routes - user's own orders
router.post("/", authMiddleware, Role(["CUSTOMER"]), orderController.createOrder);
router.get("/", authMiddleware, Role(["CUSTOMER"]), orderController.myOrders); // Any authenticated user can get their orders
router.get("/:id", authMiddleware, Role(["CUSTOMER"]), orderController.getsingleOrder);

// Seller routes
router.patch("/:id/status", authMiddleware, Role(["SELLER"]), orderController.updateOrderStatus);
router.get("/seller/orders", authMiddleware, Role(["SELLER"]), orderController.getsellerOrders);

// Admin routes
router.get("/admin/all", authMiddleware, Role(["ADMIN"]), orderController.allOrders);

export default router;