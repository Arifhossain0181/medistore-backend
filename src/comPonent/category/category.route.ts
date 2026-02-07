import { Router } from "express";
import { categoryController } from "./category.controller.js";
    import { Role } from "../../auth/middleware/role.middleware.js";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
const router = Router();

// Public route - anyone can view categories
router.get("/", categoryController.getAllCategories);

// Admin only routes
router.post("/",authMiddleware, Role(["ADMIN"]), categoryController.createCategory);
router.patch("/:id", authMiddleware, Role(["ADMIN"]), categoryController.updateCategory);
router.delete("/:id", authMiddleware, Role(["ADMIN"]), categoryController.deleteCategory);

export const categoryRouter = router;   