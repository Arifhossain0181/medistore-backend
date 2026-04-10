import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { deliveryController } from "./delivery.controller.js";

const router = Router();

router.use(authMiddleware);

router.post("/assign", Role(["SELLER", "ADMIN"]), deliveryController.assignOrder);
router.get("/orders", Role(["SELLER", "ADMIN"]), deliveryController.getOrders);
router.get("/active", Role(["SELLER", "ADMIN"]), deliveryController.getActiveOrders);
router.get("/completed", Role(["SELLER", "ADMIN"]), deliveryController.getCompletedOrders);
router.patch("/orders/:id/status", Role(["SELLER", "ADMIN"]), deliveryController.updateOrderStatus);
router.get("/profile", (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      id: req.user?.id,
      name: req.user?.name,
      email: req.user?.email,
      role: req.user?.role,
    },
  });
});

export default router;
