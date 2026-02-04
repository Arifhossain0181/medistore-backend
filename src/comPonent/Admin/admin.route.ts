import { Router,  } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { admincontroler } from "./admin.controller.js";



const router = Router();

router.get("/users", authMiddleware, Role(["ADMIN"]), admincontroler.getallusers);
router.patch("/users/:id", authMiddleware, Role(["ADMIN"]), admincontroler.banUnbanUsers);

export default router;