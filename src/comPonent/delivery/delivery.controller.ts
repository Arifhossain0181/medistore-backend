import { Request, Response } from "express";
import { deliveryService } from "./delivery.service.js";

const deliveryAllowedStatuses = ["SHIPPED", "PROCESSING", "DELIVERED", "FAILED"] as const;

export const deliveryController = {
  checkCoverage: async (req: Request, res: Response) => {
    try {
      const division = String(req.query.division || "").trim();
      const district = String(req.query.district || "").trim();
      const thana = String(req.query.thana || "").trim();

      if (!division || !district || !thana) {
        return res.status(400).json({ success: false, message: "division, district and thana are required" });
      }

      const data = await deliveryService.checkCoverage(division, district, thana);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to check coverage", error: error.message });
    }
  },

  getDeliveryMen: async (_req: Request, res: Response) => {
    try {
      const data = await deliveryService.getAvailableDeliveryMen();
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch delivery men", error: error.message });
    }
  },

  assignOrder: async (req: Request, res: Response) => {
    try {
      const { orderId, deliveryManId } = req.body as {
        orderId?: string;
        deliveryManId?: string;
      };

      if (!orderId || !deliveryManId) {
        return res.status(400).json({
          success: false,
          message: "orderId and deliveryManId are required",
        });
      }

      const data = await deliveryService.assignOrderToDeliveryMan(
        orderId,
        deliveryManId,
        req.user!.id as string,
      );

      res.status(200).json({ success: true, data, message: "Order assigned successfully" });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message || "Failed to assign order" });
    }
  },

  getOrders: async (req: Request, res: Response) => {
    try {
      const data = await deliveryService.getDeliveryOrders(req.user!.id as string, req.user!.role as string);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch delivery orders", error: error.message });
    }
  },

  getActiveOrders: async (req: Request, res: Response) => {
    try {
      const data = await deliveryService.getActiveDeliveryOrders(
        req.user!.id as string,
        req.user!.role as string,
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch active deliveries", error: error.message });
    }
  },

  getCompletedOrders: async (req: Request, res: Response) => {
    try {
      const data = await deliveryService.getCompletedDeliveryOrders(
        req.user!.id as string,
        req.user!.role as string,
      );
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch completed deliveries", error: error.message });
    }
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body as { status?: "SHIPPED" | "DELIVERED" | "FAILED" };

      if (!status || !deliveryAllowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${deliveryAllowedStatuses.join(", ")}`,
        });
      }

      const data = await deliveryService.updateDeliveryOrderStatus(
        req.params.id as string,
        req.user!.id as string,
        req.user!.role as string,
        status,
      );

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to update delivery status", error: error.message });
    }
  },
};
