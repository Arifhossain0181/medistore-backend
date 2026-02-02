import { prisma } from "../../../lib/prisma.js";
import { OrderStatus } from "../../../../generated/prisma/index.js";

export const OrderService = {

    createOrder: async (customerId: string, items: any[], shippingAddress: string) => {
        // Calculate total amount from items
        const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        return await prisma.order.create({
            data: {
                customerId,
                status: OrderStatus.PENDING,
                totalAmount,
                shippingAddress,
                items: {
                    create: items.map((item: any) => ({
                        medicineId: item.medicineId,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        medicine: true
                    }
                },
                customer: true
            }
        })
    },
    getMyOrders: async (customerId: string) => {
        return await prisma.order.findMany({
            where:{
                customerId
            },
            include:{
                items:{
                    include:{
                        medicine:true
                    }
                },
                customer:true
            }
        })
    },
    allOrders:async() =>{
        return await prisma.order.findMany({
            include:{
                items:{
                    include:{
                        medicine:true
                    }
                },
                customer:true
            }
        })
    },
    uPdatateOrderStatus: async(orderId:string, status:OrderStatus) =>{
        return await prisma.order.update({
            where:{ id: orderId },
            data:{ status },
        })
    }


}