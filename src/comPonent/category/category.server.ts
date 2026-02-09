import { prisma } from "../../lib/prisma.js";

export const categoryService = {
  createCategory: async (name: string) => {
    return await prisma.category.create({
      data: {
        name,
      },
    });
  },
  
  getAllCategories: async () => {
    return await prisma.category.findMany({
      include: {
        _count: {
          select: { medicines: true }
        }
      }
    });
  },
  
  updateCategory: async (id: string, name: string) => {
    return await prisma.category.update({
      where: { id },
      data: { name },
    });
  },
  
  deleteCategory: async (id: string) => {
    
    // Check if any medicines exist for this category
    const medicineCount = await prisma.medicine.count({
      where: { categoryId: id },
    });
    if (medicineCount > 0) {
      throw new Error("Cannot delete category: medicines exist for this category.");
    }
    return await prisma.category.delete({
      where: { id },
    });
  },
};
