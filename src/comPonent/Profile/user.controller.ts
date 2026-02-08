import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import bcrypt from "bcrypt";
import { email } from "better-auth";

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
