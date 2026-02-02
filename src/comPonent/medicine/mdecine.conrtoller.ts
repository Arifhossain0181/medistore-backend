import { Request, Response } from 'express';
import { medicineServer } from './medicine.server.js';

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
    const sellerId = req.body.sellerId;
    const medicineData = req.body;
    const newMedicine = await medicineServer.createMedicine(medicineData, sellerId);
    res.status(201).json({success:true ,data: newMedicine});

}
export const updateMedicine = async (req:Request, res:Response) =>{
    const  medicine = await medicineServer.updateMedicine(req.params.id as string, req.body, req.body.sellerId);
    if(medicine.count ===0){
        return  res.status(404).json({success:false ,message:"Medicine not found or you are not authorized"});
    }
    res.status(200).json({success:true ,data: medicine});
}
export const deleteMedicine = async (req:Request, res:Response) =>{
    const medicine = await medicineServer.deleteMedicine(req.params.id as string, req.body.sellerId ,);
}