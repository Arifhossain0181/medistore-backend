
import Stripe from "stripe";
import { prisma } from "../../lib/prisma.js";

export interface StripeItem {
    name: string;
    price: number;
    quantity: number;
}

const getStripeClient = (): Stripe => {
    const stripeSecretKey =
        process.env.STRIPE_SECRET_KEY || process.env.stripe_secret_key;

    if (!stripeSecretKey) {
        throw new Error("Missing STRIPE_SECRET_KEY in environment variables");
    }

    return new Stripe(stripeSecretKey, {
        apiVersion: "2026-03-25.dahlia",
    });
};

export const createCheckoutSessionService = async (items: StripeItem[]) => {
    const stripe = getStripeClient();

    const lineItems = items.map((item) => ({
        quantity: item.quantity,
        price_data: {
            currency: "usd",
            unit_amount: Math.round(item.price * 100),
            product_data: { name: item.name },
        },
    }));

    return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: lineItems,
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
    });
};

export const initPayment = async (userId: string, medicineId: string) => {
    const stripe = getStripeClient();

    const medicine = await prisma.medicine.findUnique({
        where: { id: medicineId },
    });
    if (!medicine) throw new Error("Medicine not found");

    if (medicine.sellerId === userId) {
        throw new Error("Seller cannot buy their own medicine");
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const existingPayment = await prisma.payment.findFirst({
        where: {
            userId,
            medicineId,
            status: "SUCCESS",
        },
    });
    if (existingPayment) throw new Error("Medicine already purchased");

    const payment = await prisma.payment.create({
        data: {
            userId,
            medicineId,
            amount: medicine.price,
            status: "PENDING",
        },
    });

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        customer_email: user.email,
        metadata: {
            paymentId: payment.id,
            userId,
            medicineId,
        },
        line_items: [
            {
                quantity: 1,
                price_data: {
                    currency: "usd",
                    unit_amount: Math.round(medicine.price * 100),
                    product_data: {
                        name: medicine.name,
                        description: medicine.description,
                    },
                },
            },
        ],
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancelled`,
    });

    await prisma.payment.update({
        where: { id: payment.id },
        data: { stripeSessionId: session.id },
    });

    return {
        url: session.url,
        sessionId: session.id,
        paymentId: payment.id,
    };
};

export const handleWebhook = async (payload: Buffer, sig: string) => {
    const stripe = getStripeClient();
    const webhookSecret =
        process.env.STRIPE_WEBHOOK_SECRET || process.env.stripe_webhook_secret;

    if (!webhookSecret) {
        throw new Error("Missing STRIPE_WEBHOOK_SECRET");
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
    } catch (err: any) {
        throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata as {
            paymentId?: string;
        };

        if (metadata?.paymentId) {
            await prisma.payment.update({
                where: { id: metadata.paymentId },
                data: {
                    status: "SUCCESS",
                    paidAt: new Date(),
                    stripePaymentIntentId:
                        typeof session.payment_intent === "string"
                            ? session.payment_intent
                            : null,
                },
            });
        }
    }

    if (event.type === "checkout.session.async_payment_failed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata as {
            paymentId?: string;
        };

        if (metadata?.paymentId) {
            await prisma.payment.update({
                where: { id: metadata.paymentId },
                data: { status: "FAILED", failureReason: "async_payment_failed" },
            });
        }
    }

    return { received: true };
};

export const verifySession = async (sessionId: string, userId: string) => {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const payment = await prisma.payment.findFirst({
        where: {
            stripeSessionId: sessionId,
            userId,
        },
    });

    if (!payment) throw new Error("Payment not found");

    if (session.payment_status === "paid" && payment.status !== "SUCCESS") {
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: "SUCCESS",
                paidAt: new Date(),
            },
        });
    }

    return {
        message: "Payment verified successfully",
        medicineId: payment.medicineId,
    };
};

export const checkAccess = async (medicineId: string, userId: string) => {
    const payment = await prisma.payment.findFirst({
        where: {
            userId,
            medicineId,
            status: "SUCCESS",
        },
    });

    return {
        hasAccess: !!payment,
        message: payment ? "Access granted" : "Payment required",
    };
};

export const getAllPaymentsForAdmin = async () => {
    return prisma.payment.findMany({
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            medicine: {
                select: {
                    id: true,
                    name: true,
                    price: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });
};

export const getMyPurchasedMedicines = async (userId: string) => {
    const payments = await prisma.payment.findMany({
        where: {
            userId,
            status: "SUCCESS",
        },
        include: {
            medicine: {
                include: {
                    category: true,
                    reviews: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    const seen = new Set<string>();
    const result: any[] = [];

    for (const p of payments) {
        if (seen.has(p.medicineId)) continue;
        seen.add(p.medicineId);

        result.push({
            id: p.medicine.id,
            name: p.medicine.name,
            description: p.medicine.description,
            price: p.medicine.price,
            imageUrl: p.medicine.imageUrl,
            category: p.medicine.category,
            purchasedAt: p.createdAt,
        });
    }

    return result;
};
