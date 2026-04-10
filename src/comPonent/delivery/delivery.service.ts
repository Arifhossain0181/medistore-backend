import { prisma } from "../../lib/prisma.js";

const managerRoles = ["SELLER", "ADMIN"] as const;
const deliveryModes = ["OWN_DELIVERY", "COURIER"] as const;

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
  checkCoverage: async (division: string, district: string, thana: string) => {
    const coverage = await prisma.deliveryCoverage.findFirst({
      where: {
        division: { equals: division, mode: "insensitive" },
        district: { equals: district, mode: "insensitive" },
        thana: { equals: thana, mode: "insensitive" },
        active: true,
      },
    });

    if (!coverage) {
      return {
        serviceable: false,
        mode: null,
        fee: 0,
        etaDays: null,
      };
    }

    return {
      serviceable: true,
      mode: coverage.deliveryMode,
      fee: coverage.fee,
      etaDays: coverage.etaDays,
      division: coverage.division,
      district: coverage.district,
      thana: coverage.thana,
    };
  },

  getAvailableDeliveryMen: async () => {
    return prisma.user.findMany({
      where: {
        role: "DELIVERY_MAN",
        isBanned: false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  },

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

    if (assignedBy.role === "SELLER") {
      const sellerOrder = await prisma.order.findFirst({
        where: {
          id: orderId,
          items: {
            some: {
              medicine: {
                sellerId: assignedById,
              },
            },
          },
        },
        select: { id: true },
      });

      if (!sellerOrder) {
        throw new Error("You can assign only your own orders");
      }
    }

    const deliveryMan = await prisma.user.findUnique({ where: { id: deliveryManId } });
    if (!deliveryMan || deliveryMan.role !== "DELIVERY_MAN") {
      throw new Error("Invalid delivery man");
    }
    if (deliveryMan.isBanned) {
      throw new Error("Delivery man account is banned");
    }

    return prisma.$transaction(async (tx) => {
      const assignment = await (tx as any).deliveryAssignment.upsert({
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

      await tx.order.update({
        where: { id: orderId },
        data: {
          status: "SHIPPED",
        },
      });

      return assignment;
    });
  },

  getDeliveryOrders: async (userId: string, role: string) => {
    if (role === "ADMIN") {
      return (prisma as any).deliveryAssignment.findMany({
        include: {
          order: { include: orderInclude },
          deliveryMan: { select: { id: true, name: true, email: true } },
          assignedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { assignedAt: "desc" },
      });
    }

    if (role === "SELLER") {
      return (prisma as any).deliveryAssignment.findMany({
        where: {
          order: {
            items: {
              some: {
                medicine: {
                  sellerId: userId,
                },
              },
            },
          },
        },
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
    const statusWhere = { in: ["ASSIGNED", "IN_TRANSIT"] as const };

    const where =
      role === "ADMIN"
        ? { status: statusWhere }
        : role === "SELLER"
        ? {
            status: statusWhere,
            order: {
              items: {
                some: {
                  medicine: {
                    sellerId: userId,
                  },
                },
              },
            },
          }
        : {
            deliveryManId: userId,
            status: statusWhere,
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
      role === "ADMIN"
        ? { status: "DELIVERED" as const }
        : role === "SELLER"
        ? {
            status: "DELIVERED" as const,
            order: {
              items: {
                some: {
                  medicine: {
                    sellerId: userId,
                  },
                },
              },
            },
          }
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

  updateDeliveryOrderStatus: async (orderId: string, userId: string, role: string, status: "SHIPPED" | "DELIVERED" | "FAILED") => {
    let where: any;

    if (role === "ADMIN") {
      where = { orderId };
    } else if (role === "SELLER") {
      where = {
        orderId,
        order: {
          items: {
            some: {
              medicine: {
                sellerId: userId,
              },
            },
          },
        },
      };
    } else {
      where = { orderId, deliveryManId: userId };
    }

    const assignment = await (prisma as any).deliveryAssignment.findFirst({ where });
    if (!assignment) {
      throw new Error("Delivery assignment not found");
    }

    const assignmentStatus = status === "DELIVERED" ? "DELIVERED" : status === "FAILED" ? "FAILED" : "IN_TRANSIT";
    const orderStatus = status === "FAILED" ? "CANCELLED" : status === "DELIVERED" ? "DELIVERED" : "SHIPPED";

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: orderStatus },
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
