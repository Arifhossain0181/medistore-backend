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
    // Validate that referenced medicines exist and use their stored prices
    const medicineIds = items.map((i) => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
      select: { id: true, price: true },
    });

    const missing = medicineIds.filter(
      (id) => !medicines.some((m) => m.id === id),
    );
    if (missing.length) {
      throw new Error(`Medicine(s) not found: ${missing.join(",")}`);
    }

    // Calculate total amount using official medicine prices when available
    const totalAmount = items.reduce((sum, item) => {
      const med = medicines.find((m) => m.id === item.medicineId)!;
      const price = item.price ?? med.price;
      return sum + price * item.quantity;
    }, 0);

    return await prisma.order.create({
      data: {
        customerId,
        status: OrderStatus.PLACED,
        totalAmount,
        shippingAddress,
        items: {
          create: items.map((item: any) => {
            const med = medicines.find((m) => m.id === item.medicineId)!;
            return {
              medicineId: item.medicineId,
              quantity: item.quantity,
              price: item.price ?? med.price,
            };
          }),
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
  getMyOrders: async (customerId: string ,email: string) => {
    return await prisma.order.findMany({
      where: {
        customerId
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
        customer: true
      },
      orderBy: {
        createdAt: 'desc'
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
    const orders = await prisma.order.findMany({
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
            id: true,
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
    });

    // Map orders to include user info and filter items for this seller only
    return orders.map(order => ({
      ...order,
      user: order.customer,
      userId: order.customerId,
      total: order.totalAmount,
      // Filter items to show only this seller's products
      items: order.items
        .filter(item => item.medicine.sellerId === sellerId)
        .map(item => item.medicine.name)
    }));
  }
};
