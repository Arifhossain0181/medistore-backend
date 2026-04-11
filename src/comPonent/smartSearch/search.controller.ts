import { Request, Response } from "express";
import { smartSearch } from "./search.service.js";

export const handleSearch = async (req: Request, res: Response) => {
  const { query } = req.query as { query: string };

  if (!query || query.trim().length < 2) {
    return res.status(400).json({
      success: false,
      message: "Query must be at least 2 characters",
    });
  }

  try {
    const { medicines, keywords, aiAdvice, medicineSuggestions } = await smartSearch(query.trim());
    return res.status(200).json({
      success: true,
      data: { medicines, keywords, aiAdvice, medicineSuggestions, total: medicines.length },
    });
  } catch (error: any) {
    console.error("Search error:", error?.message);
    return res.status(500).json({
      success: false,
      message: "Search failed",
    });
  }
};