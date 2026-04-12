import { Request, Response } from "express";
import { OrderService } from "./order.server.js";
import { prisma } from "../../lib/prisma.js";

const sellerAllowedStatuses = ["PROCESSING", "CANCELLED"];
const deliveryAllowedStatuses = ["SHIPPED", "DELIVERED", "FAILED"];

const orderInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  items: {
    include: {
      medicine: {
        select: {
          id: true,
          name: true,
          price: true,
          sellerId: true,
        },
      },
    },
  },
};

export const orderController = {
  createOrder: async (req: Request, res: Response) => {
    try {
      const { items, shippingAddress, division, district, thana, stripeSessionId } = req.body;
      const customerId = req.user!.id;
      const newOrder = await OrderService.createOrder(customerId, items, {
        shippingAddress,
        division,
        district,
        thana,
        stripeSessionId,
      });
      res.status(201).json({ success: true, data: newOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to create order", error: error.message });
    }
  },

  myOrders: async (req: Request, res: Response) => {
    try {
      const customerId = req.user!.id;
      const email = req.user!.email;
      const orders = await OrderService.getMyOrders(customerId, email as string);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch orders", error: error.message });
    }
  },

  allOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await OrderService.allOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch all orders", error: error.message });
    }
  },

  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const sellerId = req.user!.id;
      const userRole = req.user!.role;
      const orderId = req.params.id;
      const { status } = req.body;

      if (!sellerAllowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Allowed values: " + sellerAllowedStatuses.join(", "),
        });
      }

      if (userRole !== "SUPER_ADMIN" && userRole !== "SELLER") {
        const order = await prisma.order.findFirst({
          where: {
            id: orderId as string,
            items: {
              some: {
                medicine: {
                  sellerId,
                },
              },
            },
          },
        });

        if (!order) {
          return res.status(403).json({
            success: false,
            message: "You are not authorized to update this order.",
          });
        }
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId as string },
        data: { status },
        include: orderInclude,
      });

      res.status(200).json({ success: true, data: updatedOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to update order status", error: error.message });
    }
  },

  getsingleOrder: async (req: Request, res: Response) => {
    try {
      const order = await OrderService.getOrderById(req.params.id as string, req.user?.id, req.user?.role);

      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      res.status(200).json({ success: true, data: order });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch order", error: error.message });
    }
  },

  getsellerOrders: async (req: Request, res: Response) => {
    try {
      const role = req.user!.role;
      if (role === "SUPER_ADMIN") {
        const orders = await OrderService.allOrders();
        return res.status(200).json({ success: true, data: orders });
      }

      const orders = await OrderService.getOrdersForSeller(req.user!.id as string);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch seller orders", error: error.message });
    }
  },

  getDeliveryOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({
        where: { status: { in: ["PROCESSING", "SHIPPED", "DELIVERED"] } },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch delivery orders", error: error.message });
    }
  },

  getActiveDeliveryOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({
        where: { status: { in: ["PROCESSING", "SHIPPED"] } },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch active deliveries", error: error.message });
    }
  },

  getCompletedDeliveryOrders: async (_req: Request, res: Response) => {
    try {
      const orders = await prisma.order.findMany({
        where: { status: "DELIVERED" },
        include: orderInclude,
        orderBy: { createdAt: "desc" },
      });

      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch completed deliveries", error: error.message });
    }
  },

  updateDeliveryOrderStatus: async (req: Request, res: Response) => {
    try {
      const { status } = req.body;
      if (!deliveryAllowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value. Allowed values: " + deliveryAllowedStatuses.join(", "),
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: req.params.id as string },
        data: { status },
        include: orderInclude,
      });

      res.status(200).json({ success: true, data: updatedOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to update delivery status", error: error.message });
    }
  },

  updateCourierBooking: async (req: Request, res: Response) => {
    try {
      const orderId = String(req.params.id || "").trim();
      const { courierPartner, trackingNumber } = req.body as {
        courierPartner?: string;
        trackingNumber?: string;
      };

      if (!courierPartner || !trackingNumber) {
        return res.status(400).json({
          success: false,
          message: "courierPartner and trackingNumber are required",
        });
      }

      if (!orderId) {
        return res.status(400).json({ success: false, message: "Order id is required" });
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }

      if (order.fulfillmentType !== "COURIER") {
        return res.status(400).json({
          success: false,
          message: "Courier booking is only allowed for courier fulfillment orders",
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: orderId },
        data: {
          courierPartner: courierPartner.trim(),
          trackingNumber: trackingNumber.trim(),
          status: "SHIPPED",
        },
        include: orderInclude,
      });

      res.status(200).json({ success: true, data: updatedOrder });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to update courier booking", error: error.message });
    }
  },
};
