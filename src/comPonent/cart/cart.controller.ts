import { Request, Response } from "express";
import { cartService } from "./cart.server.js";

export const cartController = {
    get:async (req:Request ,res:Response)=>{
        try{
            const cart = await cartService.getCart(req.user!.id);
            res.status(200).json({success:true ,data: cart});
        } catch(error){
            res.status(500).json({success:false ,message:"Failed to get cart"});
        }
    },
    add:async (req:Request ,res:Response)=>{
        try{
            const {medicineId, quantity} = req.body;
            const item = await cartService.addCart(req.user!.id, medicineId, Number(quantity));
            res.status(201).json({success:true ,data: item});
        } catch(error){
            res.status(500).json({success:false ,message:"Failed to add item to cart"});
        }
    },
    remove:async (req:Request ,res:Response)=>{
        try{
            await cartService.deleteCartItem(req.params.id as string);
            res.json({success:true, message:"Item removed"});
        } catch(error){
            res.status(500).json({success:false ,message:"Failed to remove item from cart"});
        }
    },
    update:async (req:Request ,res:Response)=>{
        try{
            const { quantity } = req.body;
            const item = await cartService.updateCartItem(req.params.id as string, Number(quantity));
            res.json({success:true, data: item, message:"Cart item updated"});
        } catch(error){
            res.status(500).json({success:false ,message:"Failed to update cart item"});
        }
    },

}