import { Request, Response } from "express";
import { categoryService } from "./category.server.js";

export const categoryController = {
    createCategory: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, message: "Category name is required" });
            }
            const category = await categoryService.createCategory(name);
            res.status(201).json({ success: true, data: category });
        } catch (error: any) {
            res.status(500).json({ success: false, message: "Failed to create category", error: error.message });
        }
    },

    getAllCategories: async (req: Request, res: Response) => {
        try {
            const categories = await categoryService.getAllCategories();
            res.status(200).json({ success: true, data: categories });
        } catch (error: any) {
            res.status(500).json({ success: false, message: "Failed to get categories", error: error.message });
        }
    },

    updateCategory: async (req: Request, res: Response) => {
        try {
            const { name } = req.body;
            if (!name) {
                return res.status(400).json({ success: false, message: "Category name is required" });
            }
            const category = await categoryService.updateCategory(req.params.id as string, name);
            res.status(200).json({ success: true, data: category });
        } catch (error: any) {
            res.status(500).json({ success: false, message: "Failed to update category", error: error.message });
        }
    },

    deleteCategory: async (req: Request, res: Response) => {
        try {
            await categoryService.deleteCategory(req.params.id as string);
            res.status(200).json({ success: true, message: "Category deleted successfully" });
        } catch (error: any) {
            res.status(500).json({ success: false, message: "Failed to delete category", error: error.message });
        }
    }
};