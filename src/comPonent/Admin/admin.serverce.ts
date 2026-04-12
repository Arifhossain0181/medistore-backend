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
    },
    getOrderSummary: async (days: number) => {
        const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
        const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: { gte: since },
            },
            select: {
                id: true,
                status: true,
                totalAmount: true,
                createdAt: true,
                items: {
                    select: {
                        quantity: true,
                        medicine: {
                            select: {
                                id: true,
                                name: true,
                                stock: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        const totalOrders = orders.length;
        const deliveredOrders = orders.filter((o) => o.status === "DELIVERED").length;
        const cancelledOrders = orders.filter((o) => o.status === "CANCELLED").length;
        const totalRevenue = orders
            .filter((o) => o.status === "DELIVERED")
            .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

        const medicineMap = new Map<string, { name: string; qty: number; stock: number }>();
        for (const order of orders) {
            for (const item of order.items) {
                const medId = item.medicine.id;
                const prev = medicineMap.get(medId);
                if (!prev) {
                    medicineMap.set(medId, {
                        name: item.medicine.name,
                        qty: item.quantity,
                        stock: Number(item.medicine.stock || 0),
                    });
                    continue;
                }

                prev.qty += item.quantity;
            }
        }

        const ranked = Array.from(medicineMap.values()).sort((a, b) => b.qty - a.qty);
        const top = ranked.slice(0, 3);
        const lowStock = ranked.filter((m) => m.stock <= 10).slice(0, 3);

        const quickOverview =
            `গত ${safeDays} দিনে ${totalOrders}টি order এসেছে, delivered ${deliveredOrders}, ` +
            `cancelled ${cancelledOrders}, এবং delivered revenue ৳${totalRevenue.toFixed(2)}।`;

        const topSelling = top.length
            ? top.map((m, idx) => `${idx + 1}. ${m.name} (${m.qty} units)`).join(" | ")
            : "এই সময়ে top-selling medicine data পাওয়া যায়নি।";

        const inventoryWarning = lowStock.length
            ? `Low stock alert: ${lowStock.map((m) => `${m.name} (stock ${m.stock})`).join(", ")}`
            : "Critical low-stock item পাওয়া যায়নি।";

        const growthSuggestion =
            top.length > 0
                ? `Top-selling ${top[0]?.name} এর stock ও promo budget বাড়ান, এবং cancelled orders কমাতে delivery SLA monitor করুন।`
                : "Best seller identify করতে আরো order data সংগ্রহ করুন এবং returning customer campaign চালান।";

        return {
            quickOverview,
            topSelling,
            inventoryWarning,
            growthSuggestion,
            generatedAt: new Date().toISOString(),
        };
    },
}