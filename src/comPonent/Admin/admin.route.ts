import { Router,  } from "express";
import { Role } from "../../auth/middleware/role.middleware.js";
import { admincontroler } from "./admin.controller.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";


const router = Router();

router.get("/users",authMiddleware, Role(["ADMIN"]), admincontroler.getallusers);
router.patch("/users/:id", authMiddleware, Role(["ADMIN"]), admincontroler.banUnbanUsers);

export default router;