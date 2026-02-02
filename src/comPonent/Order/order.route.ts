import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { orderController } from "./order.controller.js";

const router = Router();

router.post("/", authMiddleware, Role(["CUSTOMER"]), orderController.createOrder);
router.get("/my-orders", authMiddleware, Role(["CUSTOMER"]), orderController.myOrders);

//seller routes
router.patch("/:id/status", authMiddleware, Role(["SELLER"]), orderController.updateOrderStatus);
router.get("/seller", authMiddleware, Role(["SELLER"]), orderController.getsellerOrders);
router.get("/", authMiddleware, Role(["ADMIN"]), orderController.allOrders);
router.get("/:id", authMiddleware, orderController.getsingleOrder);
export default router;