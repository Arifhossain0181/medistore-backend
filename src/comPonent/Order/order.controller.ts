import { Request, Response } from "express";
import { OrderService } from "./order.server.js";

export const orderController = {
  createOrder: async (req: Request, res: Response) => {
    try {
      const { items, shippingAddress } = req.body;
      const customerId = req.user!.id; // Get from authenticated user
      const newOrder = await OrderService.createOrder(
        customerId,
        items,
        shippingAddress,
      );
      res.status(201).json({ success: true, data: newOrder });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to create order",
          error: error.message,
        });
    }
  },
  myOrders: async (req: Request, res: Response) => {
    try {
      const customerId = req.user!.id; // Get from authenticated user
      const Orders = await OrderService.getMyOrders(customerId);
      res.status(200).json({ success: true, data: Orders });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to fetch orders",
          error: error.message,
        });
    }
  },
  allOrders: async (req: Request, res: Response) => {
    try {
      const orders = await OrderService.allOrders();
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to fetch all orders",
          error: error.message,
        });
    }
  },
  updateOrderStatus: async (req: Request, res: Response) => {
    try {
      const { orderId, status } = req.body;
      const updateOrderStatus = await OrderService.updateOrderStatus(
        orderId,
        status,
      );
      res.status(200).json({ success: true, data: updateOrderStatus });
    } catch (error: any) {
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to update order status",
          error: error.message,
        });
    }
  },
};
