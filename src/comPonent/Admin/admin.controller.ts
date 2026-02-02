
import { Request,  Response } from "express";
import { adminService } from "./admin.serverce.js"; 


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
    }
}