import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { auth } from "../lib/auth.js";

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }
    //additional logic for registeing user here
    const existinguser = await prisma.user.findUnique({ where: { email } });
    if (existinguser) {
      return res.status(409).json({ message: "User already exists" });
    }

    // Set role, default to CUSTOMER if not provided
    const userRole =
      role && ["CUSTOMER", "SELLER", "ADMIN"].includes(role.toUpperCase())
        ? role.toUpperCase()
        : "CUSTOMER";

    // Use better-auth to create user with credentials
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    // Update the user role and name in database
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role: userRole,
        name: name, // Ensure name is properly saved
      },
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res
      .status(500)
      .json({ message: "Internal server error registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "User is banned" });
    }

    // Use better-auth to sign in and create session
    const sessionData = await auth.api.signInEmail({
      body: {
        email: email,
        password: password,
      },
    });

    res.cookie("better-auth.session_token", sessionData.token, {
      httpOnly: true,
      secure: true,        // MUST on https
      sameSite: "none",    // MUST for cross-domain
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
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
    return res
      .status(500)
      .json({ message: "Internal server error login failed" });
  }
};
export const me = async (req: Request, res: Response) => {
  try {
    // Extract session token from cookies
    const cookies = req.headers.cookie?.split(";").map((c) => c.trim()) || [];
    const sessionCookie = cookies.find((c) =>
      c.startsWith("better-auth.session_token="),
    );
    const token = sessionCookie?.split("=")[1];

    if (!token) {
      return res
        .status(401)
        .json({ message: "No session token found - Please login first" });
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || !session.user) {
      return res
        .status(401)
        .json({ message: "Invalid or expired session - Please login again" });
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      return res
        .status(401)
        .json({ message: "Session expired - Please login again" });
    }

    // Return user data
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
    const sesssioncookie = cookies.find((c) =>
      c.startsWith("better-auth.session_token="),
    );
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
    return res
      .status(500)
      .json({ message: "Internal server error logout failed" });
  }
};
