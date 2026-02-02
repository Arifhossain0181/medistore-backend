import { create } from "node:domain";
import { prisma } from "../../lib/prisma.js";



export const reviewService = {

    createReview: async (customerId: string, medicineId: string, rating: number, comment: string) => {
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