import { Router } from "express";
import { getAllmedicine, getSingleMedicine, createMedicine, updateMedicine, deleteMedicine, incrementView } from "./mdecine.conrtoller.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", getAllmedicine);
router.get("/:id", getSingleMedicine);
router.post("/:id/view", incrementView);

// Seller/Super Admin protected routes
router.post("/", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), createMedicine);
router.patch("/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), updateMedicine);
router.delete("/:id", authMiddleware, Role(["SELLER", "SUPER_ADMIN"]), deleteMedicine);

export const medicineRouter = router;
