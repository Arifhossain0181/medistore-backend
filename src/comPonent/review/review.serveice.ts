import { create } from "node:domain";
import { prisma } from "../../lib/prisma.js";



export const reviewService = {

    createReview: async (customerId: string, medicineId: string, rating: number, comment: string) => {
        // Verify user has ordered this medicine
        const hasOrdered = await prisma.orderItem.findFirst({
            where: {
                medicineId,
                order: {
                    customerId,
                    status: {
                        in: ['DELIVERED', 'SHIPPED'] // Only allow reviews for shipped/delivered orders
                    }
                }
            }
        });

        if (!hasOrdered) {
            throw new Error('You can only review medicines you have ordered');
        }

        return await prisma.review.create({
            data:{
                userId: customerId,
                medicineId,
                rating,
                comment
            }
        })
    },
    getReviewsByMedicine: async (medicineId: string) => {
        return await prisma.review.findMany({
            where:{
                medicineId
            },
            include:{
                user:{
                    select:{
                        name :true
                    }
                }
            }
        })
    }
}