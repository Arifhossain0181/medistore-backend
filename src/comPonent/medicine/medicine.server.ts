
import { create } from "node:domain";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/index.js";


export const medicineServer = {
     
    
    //Public
    getALL: async (filters:any) =>{
        const {categoryId ,minPrice ,maxPrice, manufacturer} = filters;
        return prisma.medicine.findMany({
            where:{
                ...(categoryId && { categoryId }),
                ...(manufacturer && { 
                    manufacturer: {
                        contains: manufacturer,
                        mode: 'insensitive'
                    }
                }),
                ...(minPrice || maxPrice ? {
                    price: {
                        ...(minPrice && { gte: Number(minPrice) }),
                        ...(maxPrice && { lte: Number(maxPrice) }),
                    }
                } : {})
            },
            include:{
                category:true,
                seller:{select:{id:true,name:true}}
            }
        })
    },

    getSingle: async(id:string) =>{
        return prisma.medicine.findUnique({
            where:{id},
            include:{
                category:true,
                seller:true,
                reviews:true
            }

        })
    },
    //seller 
    createMedicine: async (data:any ,sellerId:string) =>{
        return prisma.medicine.create({
            data:{
                ...data,
                sellerId
            }
        })
    },
    updateMedicine: async (id:string ,data:Prisma.MedicineUpdateInput, sellerId:string) =>{
        // Any seller can update any medicine
        return prisma.medicine.update({
            where:{id},
            data
        })
    },
    // Any seller can delete any medicine
    deleteMedicine: async (id:string ,sellerId:string) =>{
        return prisma.medicine.delete({
            where:{id}
        })
    },
    incrementView: async (id:string)=>{
        return prisma.medicine.update({
            where:{id},
            data:{
                viewCount:{
                    increment:1
                }
            }
        })
    }
};