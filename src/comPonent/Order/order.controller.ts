import { Request, Response } from "express";
import { OrderService } from "./order.server.js";
import { get } from "node:http";
import { Prisma } from "../../../generated/prisma/index.js";
import { prisma } from "../../lib/prisma.js";


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
      const sellerId = req.user!.id;
      const orderId = req.params.id;
      const { status } = req.body;

      console.log('updateOrderStatus called - Seller ID:', sellerId, 'Order ID:', orderId, 'New Status:', status);

      // Validate status value first
      const allowedStatuses = [
        "PLACED",
        "CONFIRMED",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value. Allowed values: " + allowedStatuses.join(", ") });
      }

      // Check if seller is authorized to update this order (has items in the order)
      const order = await prisma.order.findFirst({
        where: {
          id: orderId as string,
          items: {
            some: {
              medicine: {
                sellerId: sellerId
              }
            }
          }
        }
      });

      if (!order) {
        return res.status(403).json({ success: false, message: "You are not authorized to update this order. No items from your medicines found in this order." });
      }

      // Update the order status
      const updatedOrder = await prisma.order.update({
        where: { id: orderId as string },
        data: { status },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          items: {
            include: {
              medicine: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  sellerId: true
                }
              }
            }
          }
        }
      });

      console.log('Order status updated successfully:', updatedOrder.id, 'New status:', updatedOrder.status);
      res.status(200).json({ success: true, data: updatedOrder });
    } catch (error: any) {
      console.error('Error updating order statussdsds:', error);
      res.status(500).json({
        success: false,
        message: "Failed to update order statussssss",
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
      console.log('Seller orders request - Seller ID:', req.user!.id);
      const orders = await OrderService.getOrdersForSeller(req.user!.id as string);
      console.log('Seller orders found:', orders.length);
      res.status(200).json({ success: true, data: orders });
    } catch (error: any) {
      console.error('Error fetching seller orders:', error);
      res.status(500).json({ success: false, message: "Failed to fetch seller orders", error: error.message });
    }
  }
};

