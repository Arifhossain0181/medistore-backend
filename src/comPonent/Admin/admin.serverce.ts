import { prisma } from "../../lib/prisma.js";
import { UserRole } from "../../../generated/prisma/index.js";


export const adminService={
    getAllUsers: async()=>{
        return await prisma.user.findMany({
            select:{
                id:true,
                email:true,
                name:true,
                role:true,
                isBanned:true,
                status:true,
                createdAt:true,
            }

        });
        
    },
    toggleBanuser:async(customerId:string,isBanned:boolean)=>{
        return await prisma.user.update({
            where:{ id: customerId },
            data:{ isBanned }
        })
    },
    updateUserRole: async(userId:string, role:UserRole)=>{
        return await prisma.user.update({
            where:{ id: userId },
            data:{ role }
        })
    }
}