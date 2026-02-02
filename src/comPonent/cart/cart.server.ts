import { prisma } from "../../lib/prisma.js";

export const cartService = {
  getCart: async (customerId: string) => {
    return await prisma.cart.findUnique({
      where: {
        customerId,
      },
      include: {
        items: {
          include: {
            medicine: true,
          },
        },
      },
    });
  },
  addCart: async (customerId: string, medicineId: string, quantity: number) => {
    const cart = await prisma.cart.upsert({
      where: {
        customerId,
      },
      create: { customerId },
      update: {},
    });
    return await prisma.cartItem.create({
      data: { cartId: cart.id, medicineId, quantity },
    });
  },
  deleteCartItem: async (cartItemId: string) => {
    return await prisma.cartItem.delete({
      where: {
        id: cartItemId,
      },
    });
  },
};
