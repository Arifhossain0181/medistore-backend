
import { Request,  Response } from "express";
import { adminService } from "./admin.serverce.js"; 
import { UserRole } from "../../../generated/prisma/index.js";


export const admincontroler={
    getallusers:async(req:Request,res:Response)=>{
        const users = await adminService.getAllUsers();
        res.status(200).json({success:true ,data: users});
    },
    banUnbanUsers :async(req:Request,res:Response)=>{
        const {isBanned} = req.body;
        try{
            const user = await adminService.toggleBanuser(req.params.id as string,isBanned);
            res.status(200).json({success:true ,data: user});
        }
        catch(error:any){
            res.status(500).json({message: "Failed to update user ban status", error: error.message});
        }
    },
    updateUserRole: async(req:Request,res:Response)=>{
        const {role} = req.body;
        try{
            if(!role || !["CUSTOMER", "SELLER", "ADMIN"].includes(role)){
                return res.status(400).json({message: "Invalid role. Must be CUSTOMER, SELLER, or ADMIN"});
            }
            const user = await adminService.updateUserRole(req.params.id as string, role as UserRole);
            res.status(200).json({success:true, data: user, message: "User role updated successfully"});
        }
        catch(error:any){
            res.status(500).json({message: "Failed to update user role", error: error.message});
        }
    }
}