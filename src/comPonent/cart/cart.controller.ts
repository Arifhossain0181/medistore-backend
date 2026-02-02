import { Request, Response } from "express";
import { cartService } from "./cart.server.js";

export const cartController = {
    get:async (req:Request ,res:Response)=>{
        const cart = await cartService.getCart(req.params.customerId as string);
        res.status(200).json({success:true ,data: cart});

    },
    add:async (req:Request ,res:Response)=>{
        const {customerId, medicineId, quantity} = req.body;
        try{
            
            const item = await cartService.addCart(customerId, medicineId, Number(quantity));

        res.status(201).json({success:true ,data: item});

    }
    catch(error){
        res.status(500).json({success:false ,message:"Failed to add item to cart"});
    }
},
remove:async (req:Request ,res:Response)=>{
    try{
        await cartService.deleteCartItem(req.params.cartItemId as string);
        res.json({message:"item removed"})
    }
    catch(error){
        res.status(500).json({success:false ,message:"Failed to remove item from cart"});
    }
},

}