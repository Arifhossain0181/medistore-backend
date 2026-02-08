import { Router } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { cartController } from "./cart.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";



const router = Router()

router.get("/" ,authMiddleware, Role(["CUSTOMER"]) ,cartController.get)
router.post("/" ,authMiddleware, Role(["CUSTOMER"]) ,cartController.add)
router.patch("/:id" ,authMiddleware, Role(["CUSTOMER"]) ,cartController.update)
router.delete("/:id" ,authMiddleware, Role(["CUSTOMER"]) ,cartController.remove)

export const cartRouter = router;