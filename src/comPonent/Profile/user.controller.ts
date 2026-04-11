import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcrypt";

export const getProfile = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                name: true,
                email: true,
                image: true,
                role: true,
                status: true,
            },
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({ success: true, user });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch profile", error });
    }
};

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        const userId = req.user.id;

        const [user, totalOrders, paidPayments] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    status: true,
                },
            }),
            prisma.order.count({
                where: { customerId: userId },
            }),
            prisma.payment.aggregate({
                where: {
                    userId,
                    status: "SUCCESS",
                },
                _sum: {
                    amount: true,
                },
            }),
        ]);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        return res.json({
            success: true,
            stats: {
                totalOrders,
                totalSpent: Number(paidPayments?._sum?.amount || 0),
                accountStatus: user.status || "ACTIVE",
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch dashboard stats", error });
    }
};

export const updateProfile = async (req: Request, res: Response) => {
            const { name ,image, email } =req.body;

    try{
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { ...(name && {name}), ...(image && {image}) ,...(email && {email})},
            select:{
                id:true,
                name:true,
                email:true,
                image:true,
                role:true,

            }
        })
        res.json({ success: true, user });
    }
    catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile", error });
  }
};

export const changePassword = async (req: Request, res: Response) => {
    const {currentPassword, newPassword} = req.body;
    try{
        if(!currentPassword || !newPassword){
            return res.status(400).json({success:false, message:"Both current and new passwords are required"});
        }
        const user = await prisma.user.findUnique({
            where:{id:req.user.id}
        })
        if(!user){
            return res.status(404).json({success:false, message:"User not found"});
        }
        const isMatch = user.password === currentPassword;
        if(!isMatch){
            return res.status(400).json({success:false, message:"Current password is incorrect"});
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where:{id:req.user.id},
            data:{password:hashedPassword}
        });
        res.json({success:true, message:"Password updated successfully"});
    }
    catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to change password", error });
  }
    }
