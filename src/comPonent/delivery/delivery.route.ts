import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { deliveryController } from "./delivery.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/coverage/check", Role(["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN", "DELIVERY_MAN"]), deliveryController.checkCoverage);
router.get("/men", Role(["SELLER", "ADMIN"]), deliveryController.getDeliveryMen);
router.post("/assign", Role(["SELLER", "ADMIN"]), deliveryController.assignOrder);
router.get("/orders", Role(["SELLER", "ADMIN", "DELIVERY_MAN"]), deliveryController.getOrders);
router.get("/active", Role(["SELLER", "ADMIN", "DELIVERY_MAN"]), deliveryController.getActiveOrders);
router.get("/completed", Role(["SELLER", "ADMIN", "DELIVERY_MAN"]), deliveryController.getCompletedOrders);
router.patch("/orders/:id/status", Role(["SELLER", "ADMIN", "DELIVERY_MAN"]), deliveryController.updateOrderStatus);
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
