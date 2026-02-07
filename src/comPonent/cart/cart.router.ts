import { Router } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { cartController } from "./cart.controller.js";



const router = Router()

router.get("/" ,Role(["CUSTOMER"]) ,cartController.get)
router.post("/" ,Role(["CUSTOMER"]) ,cartController.add)
router.patch("/:id" ,Role(["CUSTOMER"]) ,cartController.update)
router.delete("/:id" ,Role(["CUSTOMER"]) ,cartController.remove)

export const cartRouter = router;