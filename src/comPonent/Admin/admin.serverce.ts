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
            data:{
                role,
                status: "ACTIVE",
            }
        })
    },
    getDeliveryManApplications: async()=>{
        return await prisma.deliveryManApplication.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        status: true,
                    }
                },
                reviewedBy: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        })
    },
    reviewDeliveryManApplication: async(applicationId:string, action:"APPROVE" | "REJECT", reviewedById:string, rejectionReason?:string)=>{
        return await prisma.$transaction(async (tx) => {
            const application = await tx.deliveryManApplication.findUnique({
                where: { id: applicationId }
            });

            if (!application) {
                throw new Error("Delivery man application not found");
            }

            if (application.status !== "PENDING") {
                throw new Error("This delivery man application is already reviewed");
            }

            const isApproved = action === "APPROVE";

            const updatedApplication = await tx.deliveryManApplication.update({
                where: { id: applicationId },
                data: {
                    status: isApproved ? "APPROVED" : "REJECTED",
                    reviewedById,
                    reviewedAt: new Date(),
                    rejectionReason: isApproved ? null : rejectionReason || "Application rejected by admin",
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                            status: true,
                        }
                    }
                }
            });

            await tx.user.update({
                where: { id: application.userId },
                data: {
                    role: "DELIVERY_MAN",
                    status: isApproved ? "ACTIVE" : "REJECTED",
                    isBanned: false,
                }
            });

            return updatedApplication;
        });
    }
}