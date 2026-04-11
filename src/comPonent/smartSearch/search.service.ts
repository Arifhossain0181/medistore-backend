import { prisma } from "../../lib/prisma.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const SEARCH_MODEL = process.env.OPEN_ROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
const HTTP_REFERER = process.env.FRONTEND_URL || "http://localhost:3000";

const FALLBACK_MODELS = [
  SEARCH_MODEL,
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen2.5-7b-instruct:free",
].filter((model, index, arr) => model && arr.indexOf(model) === index) as string[];

type AIExtraction = {
  keywords: string[];
  aiAdvice: string | null;
  medicineSuggestions: string[];
};

// ── helpers ──────────────────────────────────────────────────────────────────

const sanitizeKeywords = (items: string[]): string[] =>
  [...new Set(items.map((k) => k.trim().toLowerCase()).filter((k) => k.length > 1))];

const parseJSON = (raw: string): AIExtraction => {
  const cleaned = raw.replace(/```json|```/g, "").trim();

  // object try
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]) as {
        advice?: string;
        aiAdvice?: string;
        keywords?: unknown;
        medicines?: unknown;
      };

      const advice =
        (typeof parsed.advice === "string" ? parsed.advice.trim() : "") ||
        (typeof parsed.aiAdvice === "string" ? parsed.aiAdvice.trim() : "") ||
        null;

      const rawKw = [
        ...(Array.isArray(parsed.keywords) ? parsed.keywords : []),
        ...(Array.isArray(parsed.medicines) ? parsed.medicines : []),
      ].filter((k): k is string => typeof k === "string");

      const keywords = sanitizeKeywords(rawKw);
      return { keywords, aiAdvice: advice, medicineSuggestions: keywords };
    } catch {
      // fall through to array try
    }
  }

  // array try
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      const arr = JSON.parse(arrMatch[0]) as unknown[];
      const keywords = sanitizeKeywords(
        arr.filter((k): k is string => typeof k === "string")
      );
      return { keywords, aiAdvice: null, medicineSuggestions: keywords };
    } catch {
      // fall through
    }
  }

  return { keywords: [], aiAdvice: null, medicineSuggestions: [] };
};

const removeEchoKeywords = (keywords: string[], query: string): string[] => {
  const queryTokens = new Set(
    query.toLowerCase().trim().split(/\s+/).map((t) => t.trim())
  );
  return keywords.filter((k) => !queryTokens.has(k) && k !== query.toLowerCase().trim());
};

// ── stock context ─────────────────────────────────────────────────────────────

const getStockContext = async (query: string): Promise<string> => {
  const byQuery = await prisma.medicine.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { category: { name: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: { name: true, price: true },
    take: 5,
  });

  if (byQuery.length) {
    return `আমাদের স্টকে আছে: ${byQuery.map((m) => `${m.name} (৳${m.price})`).join(", ")}`;
  }

  const popular = await prisma.medicine.findMany({
    select: { name: true, price: true },
    orderBy: { stock: "desc" },
    take: 5,
  });

  if (popular.length) {
    return `দোকানে সাধারণভাবে available: ${popular.map((m) => `${m.name} (৳${m.price})`).join(", ")}`;
  }

  return "বর্তমানে stock context পাওয়া যায়নি; সাধারণ OTC পরামর্শ দিন।";
};

// ── AI call ───────────────────────────────────────────────────────────────────

const callAI = async (query: string, stockInfo: string): Promise<AIExtraction> => {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) return { keywords: [], aiAdvice: null, medicineSuggestions: [] };

  const systemPrompt = `তুমি একটি pharmacy assistant।
STOCK: ${stockInfo}

User-এর symptom বা medicine query দেখে:
1. "advice" — ছোট বাংলা পরামর্শ (১-২ বাক্য), stock থেকে relevant medicine mention করো
2. "keywords" — ৩-৫টি English medicine brand/generic name (lowercase)

শুধু এই JSON format-এ দাও, অন্য কিছু না:
{"advice":"জ্বরের জন্য Napa খেতে পারেন, বিশ্রাম নিন।","keywords":["napa","paracetamol","ace"]}`;

  for (const model of FALLBACK_MODELS) {
    try {
      console.log(`→ AI search trying: ${model}`);

      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": HTTP_REFERER,
          "X-Title": "MediStore",
        },
        body: JSON.stringify({
          model,
          max_tokens: 200,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: query },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`Model ${model} failed:`, res.status, err);
        continue;
      }

      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const raw = data?.choices?.[0]?.message?.content?.trim() || "";
      console.log(`→ Raw AI response (${model}):`, raw);

      if (!raw) continue;

      const parsed = parseJSON(raw);
      const keywords = removeEchoKeywords(parsed.keywords, query);

      if (keywords.length || parsed.aiAdvice) {
        return {
          keywords,
          aiAdvice: parsed.aiAdvice,
          medicineSuggestions: keywords,
        };
      }
    } catch (err) {
      console.error(`Model ${model} exception:`, err);
    }
  }

  return { keywords: [], aiAdvice: null, medicineSuggestions: [] };
};

// ── ranking ───────────────────────────────────────────────────────────────────

const rankMedicines = <T extends { name: string }>(items: T[], keywords: string[]): T[] => {
  const kwSet = new Set(keywords.map((k) => k.toLowerCase()));
  const score = (item: T) => {
    const name = item.name.toLowerCase();
    let s = 0;
    for (const kw of kwSet) {
      if (name === kw) s += 200;
      else if (name.startsWith(kw)) s += 120;
      else if (name.includes(kw)) s += 80;
    }
    return s;
  };
  return [...items].sort((a, b) => score(b) - score(a));
};

// ── main export ───────────────────────────────────────────────────────────────

export const smartSearch = async (query: string) => {
  const stockInfo = await getStockContext(query);
  const { keywords, aiAdvice, medicineSuggestions } = await callAI(query, stockInfo);

  // search terms = AI keywords + original query tokens
  const queryTokens = query.toLowerCase().trim().split(/\s+/).filter((t) => t.length > 1);
  const searchTerms = [...new Set([...keywords, query.toLowerCase().trim(), ...queryTokens])];

  console.log("Search terms:", searchTerms);

  // first pass — name only (fast, precise)
  let medicines = await prisma.medicine.findMany({
    where: {
      OR: searchTerms.map((k) => ({
        name: { contains: k, mode: "insensitive" as const },
      })),
    },
    include: { category: true },
    take: 30,
  });

  // second pass — broader (name + desc + manufacturer + category)
  if (medicines.length === 0) {
    medicines = await prisma.medicine.findMany({
      where: {
        OR: searchTerms.flatMap((k) => [
          { name: { contains: k, mode: "insensitive" as const } },
          { description: { contains: k, mode: "insensitive" as const } },
          { manufacturer: { contains: k, mode: "insensitive" as const } },
          { category: { name: { contains: k, mode: "insensitive" as const } } },
        ]),
      },
      include: { category: true },
      take: 30,
    });
  }

  const ranked = rankMedicines(medicines, keywords).slice(0, 12);

  // fallback advice যদি AI কিছু না দেয়
  const finalAdvice =
    aiAdvice ||
    (keywords.length
      ? `"${query}" এর জন্য সাধারণত ${keywords.slice(0, 3).join(", ")} ব্যবহার করা হয়।`
      : null);

  return {
    medicines: ranked,
    keywords,
    aiAdvice: finalAdvice,
    medicineSuggestions,
    total: ranked.length,
  };
};