import { Router } from "express";
import { createMedicine, updateMedicine, deleteMedicine } from "../medicine/mdecine.conrtoller.js";
import { orderController } from "../Order/order.controller.js";
import { Role } from "../../auth/middleware/role.middleware.js";

const router = Router();

// Seller Medicine Management
router.post("/medicines", Role(["SELLER"]), createMedicine);
router.put("/medicines/:id", Role(["SELLER"]), updateMedicine);
router.delete("/medicines/:id", Role(["SELLER"]), deleteMedicine);

// Seller Order Management
router.get("/orders", Role(["SELLER"]), orderController.getsellerOrders);
router.patch("/orders/:id", Role(["SELLER"]), orderController.updateOrderStatus);

export default router;
