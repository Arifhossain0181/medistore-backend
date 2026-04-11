
import { create } from "node:domain";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "../../../generated/prisma/index.js";
import OpenAI from "openai";

const aiClient = new OpenAI({
    apiKey: process.env.OPEN_ROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
        "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
        "X-Title": "MediStore",
    },
});

const AI_MODELS = [
    process.env.OPEN_ROUTER_MODEL,
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.2-3b-instruct:free",
].filter((m): m is string => Boolean(m));

type GeneratedMedicineContent = {
    description: string;
    usage: string;
    sideEffects: string;
    fullText: string;
};


export const medicineServer = {
     
    
    //Public
    getALL: async (filters:any) =>{
        const {categoryId ,minPrice ,maxPrice, manufacturer} = filters;
        return prisma.medicine.findMany({
            where:{
                ...(categoryId && { categoryId }),
                ...(manufacturer && { 
                    manufacturer: {
                        contains: manufacturer,
                        mode: 'insensitive'
                    }
                }),
                ...(minPrice || maxPrice ? {
                    price: {
                        ...(minPrice && { gte: Number(minPrice) }),
                        ...(maxPrice && { lte: Number(maxPrice) }),
                    }
                } : {})
            },
            include:{
                category:true,
                seller:{select:{id:true,name:true}}
            }
        })
    },

    getSingle: async(id:string) =>{
        return prisma.medicine.findUnique({
            where:{id},
            include:{
                category:true,
                seller:true,
                reviews:true
            }

        })
    },
    //seller 
    createMedicine: async (data:any ,sellerId:string) =>{
        return prisma.medicine.create({
            data:{
                ...data,
                sellerId
            }
        })
    },
    updateMedicine: async (id:string ,data:Prisma.MedicineUpdateInput, sellerId:string) =>{
        // Any seller can update any medicine
        return prisma.medicine.update({
            where:{id},
            data
        })
    },
    // Any seller can delete any medicine
    deleteMedicine: async (id:string ,sellerId:string) =>{
        return prisma.medicine.delete({
            where:{id}
        })
    },
    incrementView: async (id:string)=>{
        return prisma.medicine.update({
            where:{id},
            data:{
                viewCount:{
                    increment:1
                }
            }
        })
    },
    generateMedicineContent: async (medicineName: string): Promise<GeneratedMedicineContent> => {
        const trimmedName = medicineName.trim();
        if (!trimmedName) {
            throw new Error("Medicine name is required");
        }

        const similarMedicines = await prisma.medicine.findMany({
            where: {
                OR: [
                    { name: { contains: trimmedName, mode: "insensitive" } },
                    { description: { contains: trimmedName, mode: "insensitive" } },
                ],
            },
            select: {
                name: true,
                description: true,
                manufacturer: true,
            },
            take: 3,
        });

        const ragContext = similarMedicines.length
            ? similarMedicines
                .map((m) => `Name: ${m.name}\nManufacturer: ${m.manufacturer}\nDescription: ${m.description}`)
                .join("\n\n---\n\n")
            : "No similar medicine found in database.";

        const systemPrompt = `You are a pharmacy content assistant for sellers.
Generate safe, concise and professional Bangla content in JSON only.
Fields required:
- description: 2-4 lines, what it is used for
- usage: 2-3 lines, general usage guidance (no exact dose)
- sideEffects: 2-4 common side effects and a short safety note

Return strict JSON format only:
{"description":"...","usage":"...","sideEffects":"..."}`;

        const userPrompt = `Medicine name: ${trimmedName}

RAG context from existing database:
${ragContext}`;

        for (const model of AI_MODELS) {
            try {
                const completion = await aiClient.chat.completions.create({
                    model,
                    max_tokens: 500,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt },
                    ],
                });

                const content = completion.choices?.[0]?.message?.content?.trim();
                if (!content) continue;

                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (!jsonMatch) continue;

                const parsed = JSON.parse(jsonMatch[0]) as {
                    description?: string;
                    usage?: string;
                    sideEffects?: string;
                };

                const description = (parsed.description || "").trim();
                const usage = (parsed.usage || "").trim();
                const sideEffects = (parsed.sideEffects || "").trim();

                if (!description || !usage || !sideEffects) continue;

                const fullText = `Description:\n${description}\n\nUsage:\n${usage}\n\nSide Effects:\n${sideEffects}`;

                return {
                    description,
                    usage,
                    sideEffects,
                    fullText,
                };
            } catch (error) {
                console.error(`AI generate failed for model ${model}:`, error);
            }
        }

        const fallbackDescription = `${trimmedName} একটি সাধারণভাবে ব্যবহৃত ঔষধ। এটি রোগের ধরন অনুযায়ী চিকিৎসকের পরামর্শে ব্যবহার করা হয়।`;
        const fallbackUsage = "খাবারের আগে বা পরে ব্যবহার রোগ ও রোগীর অবস্থার উপর নির্ভর করে। সঠিক ব্যবহারের জন্য ডাক্তার/ফার্মাসিস্টের নির্দেশনা অনুসরণ করুন।";
        const fallbackSideEffects = "বমিভাব, মাথা ঘোরা, পেটের অস্বস্তি ইত্যাদি হতে পারে। তীব্র পার্শ্বপ্রতিক্রিয়া হলে দ্রুত চিকিৎসকের সাথে যোগাযোগ করুন।";

        return {
            description: fallbackDescription,
            usage: fallbackUsage,
            sideEffects: fallbackSideEffects,
            fullText: `Description:\n${fallbackDescription}\n\nUsage:\n${fallbackUsage}\n\nSide Effects:\n${fallbackSideEffects}`,
        };
    }
};