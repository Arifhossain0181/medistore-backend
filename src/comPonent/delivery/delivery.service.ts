import { prisma } from "../../lib/prisma.js";

const managerRoles = ["SELLER", "ADMIN"] as const;

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

export const deliveryService = {
  assignOrderToDeliveryMan: async (orderId: string, deliveryManId: string, assignedById: string) => {
    const assignedBy = await prisma.user.findUnique({ where: { id: assignedById } });
    if (!assignedBy || !managerRoles.includes(assignedBy.role as (typeof managerRoles)[number])) {
      throw new Error("Only seller or admin can assign delivery man");
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.status === "CANCELLED" || order.status === "DELIVERED") {
      throw new Error("This order cannot be assigned");
    }

    const deliveryMan = await prisma.user.findUnique({ where: { id: deliveryManId } });
    if (!deliveryMan || deliveryMan.role !== "DELIVERY_MAN") {
      throw new Error("Invalid delivery man");
    }
    if (deliveryMan.isBanned) {
      throw new Error("Delivery man account is banned");
    }

    return (prisma as any).deliveryAssignment.upsert({
      where: { orderId },
      create: {
        orderId,
        deliveryManId,
        assignedById,
        status: "ASSIGNED",
      },
      update: {
        deliveryManId,
        assignedById,
        status: "ASSIGNED",
        assignedAt: new Date(),
        pickedAt: null,
        deliveredAt: null,
        failedAt: null,
      },
      include: {
        order: { include: orderInclude },
        deliveryMan: { select: { id: true, name: true, email: true } },
      },
    });
  },

  getDeliveryOrders: async (userId: string, role: string) => {
    if (role === "SELLER" || role === "ADMIN") {
      return (prisma as any).deliveryAssignment.findMany({
        include: {
          order: { include: orderInclude },
          deliveryMan: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "desc" },
      });
    }

    return (prisma as any).deliveryAssignment.findMany({
      where: { deliveryManId: userId },
      include: {
        order: { include: orderInclude },
      },
      orderBy: { assignedAt: "desc" },
    });
  },

  getActiveDeliveryOrders: async (userId: string, role: string) => {
    const where =
      role === "SELLER" || role === "ADMIN"
        ? { status: { in: ["ASSIGNED", "IN_TRANSIT"] as const } }
        : {
            deliveryManId: userId,
            status: { in: ["ASSIGNED", "IN_TRANSIT"] as const },
          };

    return (prisma as any).deliveryAssignment.findMany({
      where,
      include: {
        order: { include: orderInclude },
        deliveryMan: { select: { id: true, name: true, email: true } },
      },
      orderBy: { assignedAt: "desc" },
    });
  },

  getCompletedDeliveryOrders: async (userId: string, role: string) => {
    const where =
      role === "SELLER" || role === "ADMIN"
        ? { status: "DELIVERED" as const }
        : { deliveryManId: userId, status: "DELIVERED" as const };

    return (prisma as any).deliveryAssignment.findMany({
      where,
      include: {
        order: { include: orderInclude },
        deliveryMan: { select: { id: true, name: true, email: true } },
      },
      orderBy: { deliveredAt: "desc" },
    });
  },

  updateDeliveryOrderStatus: async (orderId: string, userId: string, role: string, status: "PROCESSING" | "SHIPPED" | "DELIVERED") => {
    const where = role === "SELLER" || role === "ADMIN" ? { orderId } : { orderId, deliveryManId: userId };

    const assignment = await (prisma as any).deliveryAssignment.findFirst({ where });
    if (!assignment) {
      throw new Error("Delivery assignment not found");
    }

    const assignmentStatus = status === "DELIVERED" ? "DELIVERED" : "IN_TRANSIT";

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status },
        include: orderInclude,
      });

      const deliveryAssignment = await (tx as any).deliveryAssignment.update({
        where: { id: assignment.id },
        data: {
          status: assignmentStatus,
          pickedAt: assignment.pickedAt ?? new Date(),
          deliveredAt: status === "DELIVERED" ? new Date() : null,
          failedAt: null,
        },
      });

      return { order, deliveryAssignment };
    });

    return updated;
  },
};
