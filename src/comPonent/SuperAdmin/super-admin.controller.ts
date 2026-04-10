import { Request, Response } from "express";
import {
  ALLOWED_ROLES,
  superAdminService,
} from "./super-admin.service.js";

export const superAdminController = {
  getAllUsers: async (_req: Request, res: Response) => {
    try {
      const users = await superAdminService.getAllUsers();
      res.status(200).json({ success: true, data: users });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch users", error: error.message });
    }
  },

  getSystemAdmins: async (_req: Request, res: Response) => {
    try {
      const admins = await superAdminService.getSystemAdmins();
      res.status(200).json({ success: true, data: admins });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch admins", error: error.message });
    }
  },

  updateUserRole: async (req: Request, res: Response) => {
    try {
      const { role } = req.body;
      if (!role || !ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed roles: ${ALLOWED_ROLES.join(", ")}`,
        });
      }

      const updatedUser = await superAdminService.updateUserRole(req.params.id as string, role);
      res
        .status(200)
        .json({ success: true, data: updatedUser, message: "User role updated successfully" });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update user role",
        error: error.message,
      });
    }
  },

  banUnbanUser: async (req: Request, res: Response) => {
    try {
      const { isBanned } = req.body;
      if (typeof isBanned !== "boolean") {
        return res.status(400).json({ success: false, message: "isBanned must be boolean" });
      }

      const updatedUser = await superAdminService.banUnbanUser(req.params.id as string, isBanned);
      res.status(200).json({ success: true, data: updatedUser });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update user ban status",
        error: error.message,
      });
    }
  },

  getAllOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await superAdminService.getAllOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch orders", error: error.message });
    }
  },

  getAllMedicines: async (_req: Request, res: Response) => {
    try {
      const medicines = await superAdminService.getAllMedicines();
      res.status(200).json({ success: true, data: medicines });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch medicines",
        error: error.message,
      });
    }
  },

  getReportsSummary: async (_req: Request, res: Response) => {
    try {
      const summary = await superAdminService.getReportsSummary();
      res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to load reports summary",
        error: error.message,
      });
    }
  },

  getSettings: async (_req: Request, res: Response) => {
    try {
      const settings = await superAdminService.getSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to fetch settings",
        error: error.message,
      });
    }
  },

  updateSettings: async (req: Request, res: Response) => {
    try {
      const updatedSettings = await superAdminService.updateSettings(req.body);
      res.status(200).json({
        success: true,
        data: updatedSettings,
        message: "Settings payload received successfully",
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        message: "Failed to update settings",
        error: error.message,
      });
    }
  },
};
