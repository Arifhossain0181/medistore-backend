import OpenAI from "openai";
import { prisma } from "../../lib/prisma.js";

const client = new OpenAI({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
    "X-Title": "MediStore",
  },
});

const MODEL_TIMEOUT_MS = 20000;

const CANDIDATE_VISION_MODELS = [
     "qwen/qwen2.5-vl-7b-instruct:free",
    "google/gemini-2.0-flash-exp:free",
    "meta-llama/llama-3.2-11b-vision-instruct:free",
    "qwen/qwen2.5-vl-7b-instruct:free",
    "qwen/qwen2.5-vl-72b-instruct:free",
];

const VISION_MODELS = Array.from(
    new Set(
        CANDIDATE_VISION_MODELS.filter((m): m is string => {
            if (!m) return false;
            // Force free models only for this feature.
            if (!m.includes(":free")) return false;
            // Skip deprecated/unavailable endpoint that frequently returns 404.
            if (m.includes("google/gemini-2.0-flash-exp:free")) return false;
            if (m.includes("meta-llama/llama-3.2-11b-vision-instruct:free")) return false;
            if (m.includes("openrouter/free")) return false;
            return true;
        }),
    ),
);

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
    let timer: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Model timeout after ${timeoutMs}ms`)), timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timer) clearTimeout(timer);
    }
};

type Medicine = {
  name: string;
  dosage: string;
};

type ScanAndAddResult = {
    detected: Medicine[];
    matched: Array<{ detectedName: string; medicineId: string; medicineName: string }>;
    unmatched: string[];
    addedCount: number;
};

const extractJsonArray = (raw: string): Medicine[] => {
    const text = (raw || "[]").replace(/```json|```/g, "").trim();

    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .filter((m) => m && typeof m.name === "string")
            .map((m) => ({
                name: String(m.name).trim(),
                dosage: String(m.dosage || "Not specified").trim(),
            }))
            .filter((m) => m.name.length > 0);
    } catch {
        const match = text.match(/\[[\s\S]*\]/);
        if (!match) return [];
        try {
            const fallback = JSON.parse(match[0]);
            if (!Array.isArray(fallback)) return [];
            return fallback
                .filter((m) => m && typeof m.name === "string")
                .map((m) => ({
                    name: String(m.name).trim(),
                    dosage: String(m.dosage || "Not specified").trim(),
                }))
                .filter((m) => m.name.length > 0);
        } catch {
            return [];
        }
    }
};

const findMedicineByDetectedName = async (detectedName: string) => {
    const direct = await prisma.medicine.findFirst({
        where: { name: { equals: detectedName, mode: "insensitive" } },
        select: { id: true, name: true },
    });
    if (direct) return direct;

    const token = detectedName.split(/\s+/)[0] || detectedName;
    return prisma.medicine.findFirst({
        where: {
            OR: [
                { name: { contains: detectedName, mode: "insensitive" } },
                { name: { contains: token, mode: "insensitive" } },
            ],
        },
        select: { id: true, name: true },
    });
};

export const scanPrescription = async (imageUrl: string): Promise<Medicine[]> => {
    try {
        if (!VISION_MODELS.length) {
            throw new Error("No valid free vision model configured. Set OPEN_ROUTER_MODEL to a free vision model.");
        }

        const dataUrl = imageUrl.startsWith("data:image")
            ? imageUrl
            : `data:image/jpeg;base64,${imageUrl}`;

        let lastError: any = null;

        for (const model of VISION_MODELS) {
            try {
                const response = await withTimeout(
                    client.chat.completions.create({
                        model,
                        max_tokens: 512,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `Extract all medicine names and dosage from this prescription.
Return only JSON array.
No markdown.
Format: [{"name": "Medicine Name", "dosage": "500mg twice daily"}]
If nothing found: []`,
                                    },
                                    {
                                        type: "image_url",
                                        image_url: {
                                            url: dataUrl,
                                        },
                                    },
                                ],
                            } as any,
                        ],
                    }),
                    MODEL_TIMEOUT_MS,
                );

                const raw = response.choices[0]?.message?.content || "[]";
                const text = typeof raw === "string" ? raw : "[]";
                return extractJsonArray(text);
            } catch (error: any) {
                lastError = error;
                console.error(`Prescription scan failed for model ${model}:`, error?.message || error);
            }
        }

        const lastText = String(lastError?.message || "");
            if (lastText.toLowerCase().includes("no endpoints found")) {
                throw new Error("Free vision model endpoint not available right now. Please retry after a short time.");
        }

            if (lastText.includes("rate limit") || lastText.includes("quota") || lastText.includes("429")) {
                throw new Error("Free model rate limit reached. Please wait a bit and retry.");
            }

        throw new Error("No working free vision model available right now. Please try again later.");
    } catch (error: any) {
        console.error("Error scanning prescription:", error);
        throw new Error(error?.message || "Failed to scan prescription");
    }
};

export const scanPrescriptionAndAddToCart = async (
    customerId: string,
    imageUrl: string,
): Promise<ScanAndAddResult> => {
    const detected = await scanPrescription(imageUrl);

    if (!detected.length) {
        return {
            detected: [],
            matched: [],
            unmatched: [],
            addedCount: 0,
        };
    }

    const cart = await prisma.cart.upsert({
        where: { customerId },
        update: {},
        create: { customerId },
        select: { id: true },
    });

    const matched: Array<{ detectedName: string; medicineId: string; medicineName: string }> = [];
    const unmatched: string[] = [];

    for (const item of detected) {
        const found = await findMedicineByDetectedName(item.name);
        if (!found) {
            unmatched.push(item.name);
            continue;
        }

        await prisma.cartItem.upsert({
            where: {
                cartId_medicineId: {
                    cartId: cart.id,
                    medicineId: found.id,
                },
            },
            update: {
                quantity: {
                    increment: 1,
                },
            },
            create: {
                cartId: cart.id,
                medicineId: found.id,
                quantity: 1,
            },
        });

        matched.push({
            detectedName: item.name,
            medicineId: found.id,
            medicineName: found.name,
        });
    }

    return {
        detected,
        matched,
        unmatched,
        addedCount: matched.length,
    };
};