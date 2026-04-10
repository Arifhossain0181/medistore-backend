import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { auth } from "../lib/auth.js";

const ALLOWED_ROLES = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN", "DELIVERY_MAN"];

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existinguser = await prisma.user.findUnique({ where: { email } });
    if (existinguser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const normalizedRole = typeof role === "string" ? role.toUpperCase() : "CUSTOMER";
    const userRole = ALLOWED_ROLES.includes(normalizedRole) ? normalizedRole : "CUSTOMER";

    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role: userRole,
        name,
      },
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "User is banned" });
    }

    const sessionData = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
    });

    res.cookie("better-auth.session_token", sessionData.token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 24 * 7 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error login failed" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    const cookies = req.headers.cookie?.split(";").map((c) => c.trim()) || [];
    const sessionCookie = cookies.find((c) => c.startsWith("better-auth.session_token="));
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return res.status(401).json({ message: "No session token found - Please login first" });
    }

    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.user) {
      return res.status(401).json({ message: "Invalid or expired session - Please login again" });
    }

    if (new Date(session.expiresAt) < new Date()) {
      return res.status(401).json({ message: "Session expired - Please login again" });
    }

    return res.status(200).json({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
        status: session.user.status,
        isBanned: session.user.isBanned,
        createdAt: session.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Me endpoint error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response) => {
  try {
    const cookies = req.headers.cookie?.split(";").map((c) => c.trim()) || [];
    const sesssioncookie = cookies.find((c) => c.startsWith("better-auth.session_token="));
    const token = sesssioncookie?.split("=")[1];
    if (!token) {
      return res.status(400).json({ message: "No session token found" });
    }
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    res.clearCookie("better-auth.session_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal server error logout failed" });
  }
};
