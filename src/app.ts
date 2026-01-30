import express from "express"
import cors from "cors"
import { auth } from "./lib/auth.js";
import { toNodeHandler } from "better-auth/node";
import authRoutes from "./auth/auth.route.js";

const app = express();

// Enable CORS
app.use(cors());

// Apply JSON middleware
app.use(express.json());

// Better Auth - handles all routes under /api/auth
app.use("/api/auth", toNodeHandler(auth));

// Custom auth routes (login, register, etc.)
app.use("/api/auth", authRoutes);

// Define your routes here
app.get("/", (req, res) => {
    res.send("Welcome to the Medical Backend API");
});

export default app;