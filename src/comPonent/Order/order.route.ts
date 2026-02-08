import { Router } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { orderController } from "./order.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";

const router = Router();

// Customer routes 
router.post("/", authMiddleware, Role(["CUSTOMER"]), orderController.createOrder);              
router.get("/", authMiddleware, Role(["CUSTOMER"]), orderController.myOrders);                 
router.get("/:id", authMiddleware, Role(["CUSTOMER"]), orderController.getsingleOrder);         

// Allow sellers to update order status via two routes for compatibility:
// 1) PATCH /api/orders/:id (used by some frontends)
// 2) PATCH /api/orders/:id/status (explicit)
router.patch("/:id", authMiddleware, Role(["SELLER"]), orderController.updateOrderStatus);
router.patch("/:id/status", authMiddleware, Role(["SELLER"]), orderController.updateOrderStatus); 
router.get("/seller/orders", authMiddleware, Role(["SELLER"]), orderController.getsellerOrders);   

// Admin routes -
router.get("/admin/all", authMiddleware, Role(["ADMIN"]), orderController.allOrders);          

export default router;