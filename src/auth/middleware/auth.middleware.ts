import { auth } from "../../lib/auth.js"
import { Request, Response, NextFunction } from "express";

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
        const session = await auth.api.getSession({ 
            headers: new Headers(req.headers as HeadersInit)
        });
        
        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}