import { Request, Response } from "express";
import { OrderService } from "./order.server.js";
import { get } from "node:http";


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
      console.log('myOrders called - User:', req.user);
      const customerId = req.user!.id; // Get from authenticated user
      const email = req.user!.email; // Get from authenticated user
      console.log('Fetching orders for customerId:', customerId, 'email:', email);
      const Orders = await OrderService.getMyOrders(customerId, email as string);
      console.log('Orders fetched successfully:', Orders.length);
      res.status(200).json({ success: true, data: Orders });
    } catch (error: any) {
      console.error('Error in myOrders controller:', error);
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
  getsingleOrder: async (req: Request, res: Response) => {
    try {
      const order = await OrderService.getOrderById(
        req.params.id as string,
        req.user?.id,
        req.user?.role
      );
      
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
      const orders = await OrderService.getOrdersForSeller(req.user!.id as string);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, message: "Failed to fetch seller orders", error: error.message });
    }
  }
};

