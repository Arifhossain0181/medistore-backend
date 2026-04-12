import { prisma } from "../../lib/prisma.js";
import { OrderStatus } from "../../../generated/prisma/index.js";
import { get } from "node:http";
import { create } from "node:domain";

type CreateOrderInput = {
  shippingAddress: string;
  division: string;
  district: string;
  thana: string;
  phone?: string;
};

type OrderItemWithMedicine = {
  id: string;
  medicineId: string;
  quantity: number;
  price: number;
  medicine: {
    id: string;
    name: string;
    price: number;
    sellerId: string;
    description?: string;
    imageUrl?: string | null;
  };
};

type PaymentSummaryItem = {
  medicineId: string;
  medicineName: string;
  status: string;
  amount: number;
  paidAt: Date | null;
  stripeSessionId: string | null;
};

type OrderWithPaymentSummary = {
  id: string;
  totalAmount: number;
  shippingAddress: string;
  status: OrderStatus;
  fulfillmentType: string;
  deliveryFee: number;
  etaDays: number | null;
  serviceDivision: string | null;
  serviceDistrict: string | null;
  serviceThana: string | null;
  courierPartner: string | null;
  trackingNumber: string | null;
  customerId: string;
  createdAt: Date;
  updatedAt: Date;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItemWithMedicine[];
  paymentSummary?: {
    status: "PAID" | "PARTIALLY_PAID" | "PENDING";
    totalPaidAmount: number;
    paidItems: number;
    totalItems: number;
    payments: PaymentSummaryItem[];
  };
};

const buildPaymentSummary = async (order: OrderWithPaymentSummary, customerId: string) => {
  const medicineIds = Array.from(new Set(order.items.map((item) => item.medicineId)));

  const payments = await prisma.payment.findMany({
    where: {
      userId: customerId,
      medicineId: { in: medicineIds },
    },
    select: {
      medicineId: true,
      amount: true,
      status: true,
      paidAt: true,
      stripeSessionId: true,
      medicine: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const paymentMap = new Map(
    payments.map((payment) => [payment.medicineId, payment]),
  );

  const paymentItems: PaymentSummaryItem[] = order.items.map((item) => {
    const payment = paymentMap.get(item.medicineId);

    return {
      medicineId: item.medicineId,
      medicineName: item.medicine.name,
      status: payment?.status || "PENDING",
      amount: payment?.amount || item.price * item.quantity,
      paidAt: payment?.paidAt ?? null,
      stripeSessionId: payment?.stripeSessionId ?? null,
    };
  });

  const paidItems = paymentItems.filter((item) => item.status === "SUCCESS");
  const totalPaidAmount = paidItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  let status: "PAID" | "PARTIALLY_PAID" | "PENDING" = "PENDING";
  if (paidItems.length === paymentItems.length && paymentItems.length > 0) {
    status = "PAID";
  } else if (paidItems.length > 0) {
    status = "PARTIALLY_PAID";
  }

  return {
    status,
    totalPaidAmount,
    paidItems: paidItems.length,
    totalItems: paymentItems.length,
    payments: paymentItems,
  };
};

export const OrderService = {
  createOrder: async (
    customerId: string,
    items: any[],
    orderInput: CreateOrderInput,
  ) => {
    const { shippingAddress, division, district, thana } = orderInput;

    if (!division || !district || !thana) {
      throw new Error("Delivery area selection is required");
    }

    // Validate that referenced medicines exist and use their stored prices
    const aggregatedItems = new Map<string, { quantity: number; price?: number }>();
    for (const item of items) {
      const medicineId = String(item.medicineId || "").trim();
      const quantity = Number(item.quantity || 0);

      if (!medicineId || quantity <= 0) {
        throw new Error("Invalid order item payload");
      }

      const prev = aggregatedItems.get(medicineId);
      if (prev) {
        prev.quantity += quantity;
        if (item.price !== undefined) {
          prev.price = item.price;
        }
      } else {
        aggregatedItems.set(medicineId, {
          quantity,
          price: item.price,
        });
      }
    }

    const normalizedItems = Array.from(aggregatedItems.entries()).map(([medicineId, data]) => ({
      medicineId,
      quantity: data.quantity,
      price: data.price,
    }));

    const medicineIds = normalizedItems.map((i) => i.medicineId);
    const medicines = await prisma.medicine.findMany({
      where: { id: { in: medicineIds } },
      select: { id: true, price: true, stock: true },
    });

    const missing = medicineIds.filter(
      (id) => !medicines.some((m) => m.id === id),
    );
    if (missing.length) {
      throw new Error(`Medicine(s) not found: ${missing.join(",")}`);
    }

    const coverage = await prisma.deliveryCoverage.findFirst({
      where: {
        division: { equals: division, mode: "insensitive" },
        district: { equals: district, mode: "insensitive" },
        thana: { equals: thana, mode: "insensitive" },
        active: true,
      },
    });

    if (!coverage) {
      throw new Error("Selected area is not serviceable yet. Please choose another area or contact admin.");
    }

    // Calculate total amount using official medicine prices when available
    for (const item of normalizedItems) {
      const med = medicines.find((m) => m.id === item.medicineId)!;
      if (Number(med.stock) < Number(item.quantity)) {
        throw new Error(`Insufficient stock for medicine ${item.medicineId}`);
      }
    }

    const totalAmount = normalizedItems.reduce((sum, item) => {
      const med = medicines.find((m) => m.id === item.medicineId)!;
      const price = item.price ?? med.price;
      return sum + price * item.quantity;
    }, 0);

    return await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          customerId,
          status: OrderStatus.PLACED,
          totalAmount,
          shippingAddress,
          fulfillmentType: coverage.deliveryMode,
          deliveryFee: coverage.fee,
          etaDays: coverage.etaDays,
          serviceDivision: coverage.division,
          serviceDistrict: coverage.district,
          serviceThana: coverage.thana,
          items: {
            create: normalizedItems.map((item) => {
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

      for (const item of normalizedItems) {
        await tx.medicine.update({
          where: { id: item.medicineId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return createdOrder;
    });
  },
  getMyOrders: async (customerId: string ,email: string) => {
    const orders = await prisma.order.findMany({
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

    const ordersWithPayments = await Promise.all(
      orders.map(async (order) => ({
        ...order,
        paymentSummary: await buildPaymentSummary(order as OrderWithPaymentSummary, customerId),
      })),
    );

    return ordersWithPayments;
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
      orderBy: {
        createdAt: 'desc'
      }
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

    const paymentSummary = userId
      ? await buildPaymentSummary(order as OrderWithPaymentSummary, userId)
      : undefined;

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

    return {
      ...order,
      paymentSummary,
    };
  },
  //seller specific orders

  getOrdersForSeller: async (sellerId: string) => {
    const orders = await prisma.order.findMany({
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

    // For seller dashboard workflow, expose customer orders so sellers can assign delivery quickly.
    return orders.map((order) => ({
      ...order,
      user: order.customer,
      userId: order.customerId,
      total: order.totalAmount,
      items: order.items.map((item) => item.medicine.name),
    }));
  }
};
