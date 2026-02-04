import express from "express"
import cors from "cors"
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
const app = express();

// Enable CORS with credentials
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Apply JSON middleware
app.use(express.json());

// Custom auth routes (login, register, etc.) - MUST come before better-auth
app.use("/api/auth", authRoutes);

// Better Auth - handles remaining auth routes
app.use("/api/auth", toNodeHandler(auth));

app.use("/api/medicines", medicineRouter);

app.use('/api/orders', orderRoutes);
app.use("/api/admin", adminRouter);
app.use("/api/seller", sellerRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/cart" , cartRouter);
app.use("/api/reviews" , reviewRouter);

app.use("/api/user", userRouter);
// Define your routes here
app.get("/", (req, res) => {
    res.send("Welcome to the Medical Backend API");
});

export default app;