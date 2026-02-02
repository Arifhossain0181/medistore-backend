import { create } from "node:domain";
import { Request, Response } from "express";
import { reviewService } from "./review.serveice.js";


export const reviewController = {
    createReview: async (req:Request, res:Response) => {
        try{
            const { customerId, medicineId, rating, comment } = req.body;
            const review =await reviewService.createReview(customerId, medicineId, Number(rating), comment);
            res.status(201).json({success:true ,data: review});

        }
        catch(error){
            res.status(500).json({success:false ,message:"Failed to create review"});
        }

    },
    getReviewsByMedicine: async (req:Request, res:Response) => {
        try{
            const reviews = await reviewService.getReviewsByMedicine(req.params.medicineId as string);
            res.status(200).json({success:true ,data: reviews});
        }
        catch(error){
            res.status(500).json({success:false ,message:"Failed to get reviews"});
        }
    }
}