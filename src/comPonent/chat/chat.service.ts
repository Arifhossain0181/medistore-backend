import OpenAI from "openai";
import { prisma } from "../../lib/prisma.js";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
};

type ChatUser = {
  id: string;
  role: "CUSTOMER" | "SELLER" | "ADMIN" | "SUPER_ADMIN" | "DELIVERY_MAN";
};

const client = new OpenAI({
  apiKey: process.env.OPEN_ROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": process.env.FRONTEND_URL || "http://localhost:3000",
    "X-Title": "MediStore",
  },
});

const MODEL_CANDIDATES = [
  process.env.OPEN_ROUTER_MODEL,
  "openai/gpt-4o-mini",
  "meta-llama/llama-3.2-3b-instruct:free",
].filter((m): m is string => Boolean(m));

const SYSTEM_PROMPT = `You are MediStore AI Assistant.
Rules:
- Answer in Bangla (simple and concise).
- For medicine questions, provide safe OTC guidance.
- Do not suggest prescription-only medicine.
- For severe symptoms, advise doctor consultation.`;

const getLastUserQuestion = (messages: ChatMessage[]) => {
  return [...messages].reverse().find((m) => m.role === "user")?.content?.trim() || "";
};

const detectIntent = (question: string) => {
  const q = question.toLowerCase();

  if (
    q.includes("medicine list") ||
    q.includes("list of medicine") ||
    q.includes("available medicine") ||
    (q.includes("medicine") && q.includes("list")) ||
    (q.includes("medicine") && q.includes("ki ki"))
  ) {
    return "medicineList" as const;
  }

  if (
    q.includes("category") ||
    q.includes("categories") ||
    q.includes("catagory") ||
    q.includes("type") ||
    q.includes("division") ||
    q.includes("vibhag") ||
    q.includes("section")
  ) {
    return "category" as const;
  }

  if (q.includes("order") || q.includes("status") || q.includes("delivery") || q.includes("track")) {
    return "order" as const;
  }

  if (q.includes("payment") || q.includes("pay") || q.includes("amount") || q.includes("tk") || q.includes("taka")) {
    return "payment" as const;
  }

  if (q.includes("summary") || q.includes("account")) {
    return "summary" as const;
  }

  if (q.includes("earning") || q.includes("earn") || q.includes("assigned") || q.includes("today delivery")) {
    return "deliveryMan" as const;
  }

  return "medicine" as const;
};

const extractKeyword = (question: string) => {
  const words = question
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3);
  return words[0] || question;
};

const answerWithCategories = async (): Promise<string> => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        name: true,
        _count: {
          select: { medicines: true },
        },
      },
    });

    if (!categories.length) {
      return "Ekhono database-e category nai. Somoy add hobe.";
    }

    const catList = categories
      .map((c) => `- ${c.name} (${c._count.medicines} products)`)
      .join("\n");

    return `MediStore-er categories:\n${catList}`;
  } catch (error: any) {
    console.error("Category fetch error:", error?.message || error);
    return "Category list akhon fetch korte parchi na. Ektu pore abar try korun.";
  }
};

const answerWithMedicineList = async (): Promise<string> => {
  try {
    const medicines = await prisma.medicine.findMany({
      select: {
        name: true,
        price: true,
        stock: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    if (!medicines.length) {
      return "Ekhono database-e kono medicine nai.";
    }

    const medList = medicines
      .map((m) => `- ${m.name} | category: ${m.category.name} | price: ${m.price} | stock: ${m.stock}`)
      .join("\n");

    return `Available medicines (latest 20):\n${medList}`;
  } catch (error: any) {
    console.error("Medicine list fetch error:", error?.message || error);
    return "Medicine list akhon fetch korte parchi na. Ektu pore abar try korun.";
  }
};

const answerFromMedicineDb = async (question: string): Promise<string> => {
  try {
    const keyword = extractKeyword(question);

    const matches = await prisma.medicine.findMany({
      where: {
        OR: [
          { name: { contains: keyword, mode: "insensitive" } },
          { description: { contains: keyword, mode: "insensitive" } },
          { manufacturer: { contains: keyword, mode: "insensitive" } },
        ],
      },
      take: 3,
      select: {
        name: true,
        description: true,
        manufacturer: true,
        price: true,
        stock: true,
      },
    });

    if (!matches.length) {
      return "Dukkhito, matching medicine database-e pelam na. Medicine name diye abar jiggesh korun.";
    }

    const lines = matches
      .map((m) => `- ${m.name} (${m.manufacturer}) | price: ${m.price} | stock: ${m.stock} | ${m.description}`)
      .join("\n");

    return `Database theke pawa info:\n${lines}\n\nDose person-bhede alada hote pare. Proyojone doctor-er poramorsho nin.`;
  } catch (error: any) {
    console.error("Medicine DB fallback error:", error?.message || error);
    return "Akhon medicine database access korte parchi na. Please ektu pore abar try korun.";
  }
};

const answerForCustomerOrders = async (userId: string) => {
  const [orders, paidAgg, pendingCount] = await Promise.all([
    prisma.order.findMany({
      where: { customerId: userId },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, totalAmount: true, createdAt: true },
    }),
    prisma.payment.aggregate({
      where: { userId, status: "SUCCESS" },
      _sum: { amount: true },
    }),
    prisma.payment.count({
      where: { userId, status: { in: ["PENDING", "FAILED"] } },
    }),
  ]);

  if (!orders.length) {
    return "Apnar ekhono kono order pawa jayni.";
  }

  const totalPaid = Number(paidAgg._sum.amount || 0);
  const latest = orders[0];
  if (!latest) {
    return "Order data akhon available na.";
  }
  const orderLines = orders
    .map((o) => `#${o.id.slice(0, 8)} | ${o.status} | ${o.totalAmount} | ${o.createdAt.toLocaleDateString()}`)
    .join("\n");

  return `Total orders: ${orders.length}\nLast order status: ${latest.status}\nTotal paid: ${totalPaid}\nPending payment entries: ${pendingCount}\nRecent orders:\n${orderLines}`;
};

const answerForDeliveryMan = async (userId: string) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayAssigned, pending, deliveredToday] = await Promise.all([
    (prisma as any).deliveryAssignment.count({
      where: { deliveryManId: userId, assignedAt: { gte: todayStart } },
    }),
    (prisma as any).deliveryAssignment.count({
      where: { deliveryManId: userId, status: { in: ["ASSIGNED", "IN_TRANSIT"] } },
    }),
    (prisma as any).deliveryAssignment.findMany({
      where: { deliveryManId: userId, status: "DELIVERED", deliveredAt: { gte: todayStart } },
      include: { order: { select: { totalAmount: true } } },
    }),
  ]);

  const earnings = deliveredToday.reduce((sum: number, d: any) => sum + Number(d.order?.totalAmount || 0), 0);

  return `Today assigned deliveries: ${todayAssigned}\nPending deliveries: ${pending}\nDelivered today: ${deliveredToday.length}\nEstimated earnings today: ${earnings}`;
};

const askAI = async (messages: ChatMessage[]): Promise<string | null> => {
  for (const model of MODEL_CANDIDATES) {
    try {
      const response = await client.chat.completions.create({
        model,
        max_tokens: 1024,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        return content;
      }
    } catch (error: any) {
      console.error(`OpenRouter error (${model}):`, error?.message || error);
    }
  }

  return null;
};

export const sendMessage = async (messages: ChatMessage[], user?: ChatUser | null): Promise<string> => {
  try {
    const question = getLastUserQuestion(messages);
    const intent = detectIntent(question);

    if (!question) {
      return "Question ta abar likhun, ami help korchi.";
    }

    if (intent === "medicineList") {
      return answerWithMedicineList();
    }

    if (intent === "category") {
      return answerWithCategories();
    }

    if (intent === "order" || intent === "payment" || intent === "summary") {
      if (!user) {
        return "Order/Payment info dekhte hole login korte hobe.";
      }
      if (user.role !== "CUSTOMER") {
        return "Ei info customer account-er jonno.";
      }
      return answerForCustomerOrders(user.id);
    }

    if (intent === "deliveryMan") {
      if (!user) {
        return "Delivery info dekhte hole login korte hobe.";
      }
      if (user.role !== "DELIVERY_MAN") {
        return "Ei summary sudhu delivery man account-er jonno.";
      }
      return answerForDeliveryMan(user.id);
    }

    const aiAnswer = await askAI(messages);
    if (aiAnswer) {
      return aiAnswer;
    }

    return answerFromMedicineDb(question);
  } catch (error: any) {
    console.error("sendMessage error:", error?.message || error);
    return "Dukkhito, ekhon chat service-e temporary issue hocche. Ektu pore abar try korun.";
  }
};
