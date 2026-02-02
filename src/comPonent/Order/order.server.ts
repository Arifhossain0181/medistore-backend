import { prisma } from "../../lib/prisma.js";
import { OrderStatus } from "../../../generated/prisma/index.js";
import { get } from "node:http";
import { create } from "node:domain";

export const OrderService = {
  createOrder: async (
    customerId: string,
    items: any[],
    shippingAddress: string,
  ) => {
    // Calculate total amount from items
    const totalAmount = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    return await prisma.order.create({
      data: {
        customerId,
        status: OrderStatus.PLACED,
        totalAmount,
        shippingAddress,
        items: {
          create: items.map((item: any) => ({
            medicineId: item.medicineId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        customer: true,
      },
    });
  },
  getMyOrders: async (customerId: string) => {
    return await prisma.order.findMany({
      where: {
        customerId,
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        customer: true,
      },
    });
  },
  allOrders: async () => {
    return await prisma.order.findMany({
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        customer: true,
      },
    });
  },
  updateOrderStatus: async (orderId: string, status: OrderStatus) => {
    return await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  },
  getOrderById: async (orderId: string, userId?: string, userRole?: string) => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
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
      },
    });

    if (!order) {
      return null;
    }

    // Authorization checks if user info is provided
    if (userId && userRole) {
      if (userRole === "CUSTOMER" && order.customerId !== userId) {
        throw new Error("Access denied");
      }

      if (userRole === "SELLER") {
        const hasMedicine = order.items.some(
          (item: any) => item.medicine.sellerId === userId
        );
        if (!hasMedicine) {
          throw new Error("Access denied");
        }
      }
    }

    return order;
  },
  //seller specific orders

  getOrdersForSeller: async (sellerId: string) => {
    return await prisma.order.findMany({
      where:{
        items:{
          some:{
            medicine:{
              sellerId: sellerId
            }
          }
        }
      },
      include:{
        customer:{
          select:{
            name:true,
            email:true
          }
        },
        items:{
          include:{
            medicine:{
              select:{
                id:true,
                name:true,
                price:true,
                sellerId:true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
};
