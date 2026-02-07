import { auth } from "../../lib/auth.js"
import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma.js";

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // Extract session token from cookies
        const cookies = req.headers.cookie;
        if (!cookies) {
            console.log("No cookies found in request");
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Parse the session token from cookies
        const sessionToken = cookies
            .split(';')
            .find(c => c.trim().startsWith('better-auth.session_token='))
            ?.split('=')[1];

        if (!sessionToken) {
            console.log("No session token found in cookies");
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Query session from database
        const session = await prisma.session.findUnique({
            where: { token: sessionToken },
            include: { 
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isBanned: true
                    }
                }
            }
        });

        if (!session) {
            console.log("Session not found in database");
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Check if session is expired
        if (new Date(session.expiresAt) < new Date()) {
            console.log("Session expired");
            return res.status(401).json({ message: "Session expired" });
        }

        // Check if user is banned
        if (session.user.isBanned) {
            console.log("User is banned");
            return res.status(403).json({ message: "User is banned" });
        }

        req.user = session.user;
        console.log("Authenticated user:", { id: session.user.id, email: session.user.email, role: session.user.role });
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ message: "Unauthorized" });
    }
}