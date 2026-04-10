import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import authRoutes from "./auth/auth.route.js";
import { medicineRouter } from "./comPonent/medicine/medicine.route.js";
import { categoryRouter } from "./comPonent/category/category.route.js";
import adminRouter from "./comPonent/Admin/admin.route.js";
import orderRoutes from "./comPonent/Order/order.route.js";
import { cartRouter } from "./comPonent/cart/cart.router.js";
import { reviewRouter } from "./comPonent/review/review.route.js";
import userRouter from "./comPonent/Profile/user.route.js";
import sellerRouter from "./comPonent/seller/seller.route.js";
import deliveryRouter from "./comPonent/delivery/delivery.route.js";
import superAdminRouter from "./comPonent/SuperAdmin/super-admin.route.js";
import paymentRouter from "./comPonent/Paymnets/payment.routes.js";
import { authMiddleware } from "./auth/middleware/auth.middleware.js";

const app = express();
app.use("/api/payment/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "https://medistore-frontend-nu.vercel.app",
    credentials: true,
  }),
);

// Custom auth routes (login, register, etc.)
app.use("/api/auth", authRoutes);

// Better Auth routes
app.use("/api/auth", toNodeHandler(auth));

// API routes
app.use("/api/medicines", medicineRouter);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/super-admin", superAdminRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/delivery", deliveryRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/cart", cartRouter);
app.use("/api/reviews", reviewRouter);
app.use("/api/user", userRouter);
app.use("/api/payment", paymentRouter);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "MediStore Backend API is running",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      medicines: "/api/medicines",
      categories: "/api/categories",
      orders: "/api/orders",
      cart: "/api/cart",
      reviews: "/api/reviews",
      admin: "/api/admin",
      superAdmin: "/api/super-admin",
      seller: "/api/seller",
      delivery: "/api/delivery",
      user: "/api/user",
      payment: "/api/payment",
    },
  });
});

app.get("/api/debug/auth", authMiddleware, (req, res) => {
  res.json({
    message: "Authenticated",
    user: req.user,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    error: "Not Found",
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Global error handler:", err);

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    error: process.env.NODE_ENV === "production" ? "Server Error" : err.stack,
  });
});

export default app;
