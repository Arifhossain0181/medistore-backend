import { prisma } from "../../lib/prisma.js";

// ── types ─────────────────────────────────────────────────────────────────────

type SmartSearchMedicine = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  manufacturer: string;
  category: string;
  stock: number;
};

type SmartSearchResult = {
  medicines: SmartSearchMedicine[];
  keywords: string[];
  aiAdvice: string;
  medicineSuggestions: string[];
};

export const smartSearch = async (query: string): Promise<SmartSearchResult> => {
  const normalized = query.trim();
  if (!normalized) {
    return {
      medicines: [],
      keywords: [],
      aiAdvice: "No search query provided.",
      medicineSuggestions: [],
    };
  }

  const keywords = Array.from(
    new Set(
      normalized
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2)
    )
  ).slice(0, 8);

  const terms = keywords.length ? keywords : [normalized.toLowerCase()];
  const searchClauses = terms.flatMap((term) => [
    { name: { contains: term, mode: "insensitive" as const } },
    { description: { contains: term, mode: "insensitive" as const } },
    { manufacturer: { contains: term, mode: "insensitive" as const } },
  ]);

  const results = await prisma.medicine.findMany({
    where: {
      OR: searchClauses,
    },
    include: { category: true },
    orderBy: [{ viewCount: "desc" }, { createdAt: "desc" }],
    take: 25,
  });

  const medicines: SmartSearchMedicine[] = results.map((m) => ({
    id: m.id,
    name: m.name,
    price: Number(m.price),
    description: m.description,
    manufacturer: m.manufacturer,
    category: m.category?.name || "Medicine",
    stock: Number(m.stock),
  }));

  const medicineSuggestions = medicines.slice(0, 5).map((m) => m.name);

  return {
    medicines,
    keywords,
    aiAdvice:
      medicines.length > 0
        ? "Search results are based on medicine name, description and manufacturer matches."
        : "No matching medicines found. Try a brand name, generic name, or manufacturer.",
    medicineSuggestions,
  };
};
