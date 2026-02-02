import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { cartController } from "./cart.controller.js";



const router = Router()

router.get("/" ,authMiddleware,Role(["CUSTOMER"]) ,cartController.get)
router.post("/" ,authMiddleware,Role(["CUSTOMER"]) ,cartController.add)
router.delete("/:id" ,authMiddleware,Role(["CUSTOMER"]) ,cartController.remove)