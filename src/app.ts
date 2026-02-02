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
const app = express();

// Enable CORS
app.use(cors());

// Apply JSON middleware
app.use(express.json());

// Better Auth - handles all routes under /api/auth
app.use("/api/auth", toNodeHandler(auth));

// Custom auth routes (login, register, etc.)
app.use("/api/auth", authRoutes);

app.use("/api/medicine", medicineRouter);

app.use('/api/orders', orderRoutes);
app.use("/api/admin", adminRouter);
app.use("api/categoryes", categoryRouter);
app.use("/api/cart" , cartRouter);
app.use("/api/reviews" , reviewRouter);

// Define your routes here
app.get("/", (req, res) => {
    res.send("Welcome to the Medical Backend API");
});

export default app;