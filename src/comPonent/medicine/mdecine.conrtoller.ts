import { Request, Response } from 'express';
import { medicineServer } from './medicine.server.js';
import { me } from '../../auth/auth.controller.js';

export const getAllmedicine  = async (req: Request, res: Response) =>{
    
    const medicines = await medicineServer.getALL(req.query);
    res.status(200).json({success:true ,data: medicines});
}
export const getSingleMedicine = async (req:Request, res:Response) =>{
    const {id} = req.params;
    const medicine= await medicineServer.getSingle(id as string);
    if(!medicine){
        return res.status(404).json({success:false ,message:"Medicine not found"});
    }
    res.status(200).json({success:true ,data: medicine});
}
export const createMedicine = async (req:Request, res:Response) =>{
    try {
        const { name, description, price, stock, manufacturer, imageUrl, categoryId } = req.body;
        const sellerId = req.user!.id;
        
        const medicineData = {
            name,
            description,
            price: Number(price),
            stock: Number(stock),
            manufacturer,
            imageUrl,
            categoryId
        };
        
        const newMedicine = await medicineServer.createMedicine(medicineData, sellerId);
        res.status(201).json({success:true ,data: newMedicine});
    } catch (error: any) {
        console.error('Create medicine error:', error);
        res.status(500).json({ success: false, message: "Failed to create medicine", error: error.message });
    }
}
export const updateMedicine = async (req:Request, res:Response) =>{
    try {
        const updateData = req.body;
        const sellerId = req.user!.id;
        const medicine = await medicineServer.updateMedicine(req.params.id as string, updateData, sellerId);
        if(!medicine){
            return res.status(404).json({success:false, message:"Medicine not found"});
        }
        res.status(200).json({success:true, data: medicine});
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Failed to update medicine", error: error.message });
    }
}
export const deleteMedicine = async (req:Request, res:Response) =>{
    try {
        const sellerId = req.user!.id;
        const medicine = await medicineServer.deleteMedicine(req.params.id as string, sellerId);
        if(!medicine){
            return res.status(404).json({success:false, message:"Medicine not found"});
        }
        res.status(200).json({success:true, message: "Medicine deleted successfully"});
    } catch (error: any) {
        res.status(500).json({ success: false, message: "Failed to delete medicine", error: error.message });
    }
}
export const incrementView  = async (req: Request, res: Response) => {
    try{
        const {id} = req.params;
        await medicineServer.incrementView(id as string);
        res.json({success:true});
    }
    catch(error:any){
        res.status(500).json({ success: false, message: "Failed to increment view count", error: error.message });
    }
}

export const generateMedicineDescription = async (req: Request, res: Response) => {
    try {
        const { name } = req.body as { name?: string };

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                success: false,
                message: "Medicine name is required",
            });
        }

        const generated = await medicineServer.generateMedicineContent(name);

        return res.status(200).json({
            success: true,
            data: generated,
        });
    } catch (error: any) {
        console.error("Generate medicine description error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate medicine description",
            error: error?.message,
        });
    }
};