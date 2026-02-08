import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import authRoutes from "./auth/auth.route.js";
import { medicineRouter } from "./comPonent/medicine/medicine.route.js";
import { categoryRouter } from "./comPonent/category/category.route.js";
import adminRouter from "./comPonent/Admin/admin.route.js";
import orderRoutes from "./comPonent/Order/order.route.js";
import { cartRouter,  } from "./comPonent/cart/cart.router.js";
import { reviewRouter } from "./comPonent/review/review.route.js";
import userRouter from "./comPonent/Profile/user.route.js";
import sellerRouter from "./comPonent/seller/seller.route.js";
import { authMiddleware } from "./auth/middleware/auth.middleware.js";
const app = express();

// Enable CORS with credentials
app.use(cors({
  origin:"https://medical-backend-arif-hossains-projects-10336566.vercel.app" ,
  credentials: true,
}));

// Apply JSON middlewarezz
app.use(express.json());

// Parse cookies for Better Auth session
app.use(cookieParser());

// Custom auth routes (login, register, etc.) - MUST come before better-auth
app.use("/api/auth", authRoutes);

// Better Auth - handles remaining auth routes
app.use("/api/auth", toNodeHandler(auth));

// Routes (auth middleware is applied individually in each route file where needed)
app.use("/api/medicines", medicineRouter);

app.use('/api/orders', orderRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/cart" , cartRouter);
app.use("/api/reviews" , reviewRouter);

app.use("/api/user", userRouter);

// Debug endpoint to check authentication
app.get("/api/debug/auth", authMiddleware, (req, res) => {
  res.json({
    message: "Authenticated",
    user: req.user
  });
});

// Root endpoint - API health check
app.get("/", (req, res) => {
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
      seller: "/api/seller",
      user: "/api/user"
    }
  });
});

// 404 handler - must be after all routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.url} not found`,
    error: "Not Found"
  });
});

// Global error handler - must be last
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    error: process.env.NODE_ENV === 'production' ? 'Server Error' : err.stack
  });
});

export default app;