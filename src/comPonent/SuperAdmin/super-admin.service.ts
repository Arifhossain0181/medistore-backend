import { prisma } from "../../lib/prisma.js";

export const ALLOWED_ROLES = [
  "CUSTOMER",
  "SELLER",
  "ADMIN",
  "SUPER_ADMIN",
  "DELIVERY_MAN",
] as const;

export type AllowedRole = (typeof ALLOWED_ROLES)[number];

export const superAdminService = {
  getAllUsers: async () => {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getSystemAdmins: async () => {
    return prisma.user.findMany({
      where: { OR: [{ role: "ADMIN" }, { role: "SUPER_ADMIN" as any }] },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  updateUserRole: async (userId: string, role: AllowedRole) => {
    return prisma.user.update({
      where: { id: userId },
      data: {
        role,
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        status: true,
      },
    });
  },

  banUnbanUser: async (userId: string, isBanned: boolean) => {
    return prisma.user.update({
      where: { id: userId },
      data: { isBanned },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isBanned: true,
        status: true,
      },
    });
  },

  getAllOrders: async () => {
    return prisma.order.findMany({
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
      orderBy: { createdAt: "desc" },
    });
  },

  getAllMedicines: async () => {
    return prisma.medicine.findMany({
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  },

  getReportsSummary: async () => {
    const [users, medicines, orders, deliveredOrders, revenueResult] = await Promise.all([
      prisma.user.count(),
      prisma.medicine.count(),
      prisma.order.count(),
      prisma.order.count({ where: { status: "DELIVERED" } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: "DELIVERED" },
      }),
    ]);

    return {
      users,
      medicines,
      orders,
      deliveredOrders,
      deliveredRevenue: revenueResult._sum.totalAmount || 0,
    };
  },

  getSettings: async () => {
    return {
      maintenanceMode: false,
      registrationOpen: true,
      message: "Super admin settings endpoint is active",
    };
  },

  updateSettings: async (payload: unknown) => {
    return payload;
  },
};
