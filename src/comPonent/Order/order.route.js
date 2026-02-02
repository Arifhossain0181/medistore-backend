import { Router } from "express"
import { createOrder } from "./order.controller.js"
import { authMiddleware } from "../../../middleware/authMiddleware.js"
import { role } from "../../../middleware/roleMiddleware.js"
import { orderController } from "./order.controller.js"

const router = Router()


router.post("/",authMiddleware,role(["CUSTOMER"]),orderController.createOrder)
router.get("/my-orders",authMiddleware,role(["CUSTOMER"]),orderController.myOrders)

//seller routes
router.patch("/:id/status",authMiddleware,role(["SELLER"]),orderController.updateOrderStatus)
router.get("/",authMiddleware,role(["ADMIN"]),orderController.allOrders)