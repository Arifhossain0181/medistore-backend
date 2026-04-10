import { Router } from "express";
import { authMiddleware } from "../../auth/middleware/auth.middleware.js";
import { Role } from "../../auth/middleware/role.middleware.js";
import { superAdminController } from "./super-admin.controller.js";

const router = Router();

router.use(authMiddleware, Role(["SUPER_ADMIN"]));

router.get("/users", superAdminController.getAllUsers);
router.get("/admins", superAdminController.getSystemAdmins);
router.patch("/users/:id/ban", superAdminController.banUnbanUser);
router.patch("/users/:id/role", superAdminController.updateUserRole);
router.get("/orders", superAdminController.getAllOrders);
router.get("/medicines", superAdminController.getAllMedicines);
router.get("/reports", superAdminController.getReportsSummary);
router.get("/reports/summary", superAdminController.getReportsSummary);
router.get("/settings", superAdminController.getSettings);
router.patch("/settings", superAdminController.updateSettings);

export default router;
