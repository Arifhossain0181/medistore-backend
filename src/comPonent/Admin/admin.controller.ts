import { Request, Response } from "express";
import { adminService } from "./admin.serverce.js";
import { UserRole } from "../../../generated/prisma/index.js";

const ALLOWED_ROLES = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN", "DELIVERY_MAN"];

export const admincontroler = {
  getOrderSummary: async (req: Request, res: Response) => {
    try {
      const parsed = Number(req.query.days);
      const days = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 7;
      const summary = await adminService.getOrderSummary(days);
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to generate order summary", error: error.message });
    }
  },

  getallusers: async (_req: Request, res: Response) => {
    const users = await adminService.getAllUsers();
    res.status(200).json({ success: true, data: users });
  },

  banUnbanUsers: async (req: Request, res: Response) => {
    const { isBanned } = req.body;
    try {
      const user = await adminService.toggleBanuser(req.params.id as string, isBanned);
      res.status(200).json({ success: true, data: user });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update user ban status", error: error.message });
    }
  },

  updateUserRole: async (req: Request, res: Response) => {
    const { role } = req.body;
    try {
      if (!role || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          message: `Invalid role. Must be one of: ${ALLOWED_ROLES.join(", ")}`,
        });
      }

      const user = await adminService.updateUserRole(req.params.id as string, role as UserRole);
      res.status(200).json({ success: true, data: user, message: "User role updated successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update user role", error: error.message });
    }
  },

  getDeliveryManApplications: async (_req: Request, res: Response) => {
    try {
      const applications = await adminService.getDeliveryManApplications();
      res.status(200).json({ success: true, data: applications });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch delivery man applications", error: error.message });
    }
  },

  reviewDeliveryManApplication: async (req: Request, res: Response) => {
    try {
      const { action, rejectionReason } = req.body;
      if (action !== "APPROVE" && action !== "REJECT") {
        return res.status(400).json({ message: "action must be APPROVE or REJECT" });
      }

      if (!req.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const reviewed = await adminService.reviewDeliveryManApplication(
        req.params.id as string,
        action,
        req.user.id,
        rejectionReason,
      );

      res.status(200).json({ success: true, data: reviewed, message: `Application ${action.toLowerCase()}d` });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to review delivery man application", error: error.message });
    }
  },
};
