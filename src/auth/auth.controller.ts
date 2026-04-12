import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { prisma } from "../lib/prisma.js";
import { auth } from "../lib/auth.js";
import { UserRole } from "../../generated/prisma/index.js";

const ALLOWED_ROLES = ["CUSTOMER", "SELLER", "ADMIN", "SUPER_ADMIN", "DELIVERY_MAN"];

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Keep normal registration strictly for CUSTOMER only.
    if (role && String(role).toUpperCase() !== "CUSTOMER") {
      return res.status(400).json({
        message: "Use delivery man application for delivery registration",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existinguser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existinguser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(String(password));

    await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          role: "CUSTOMER",
          status: "ACTIVE",
          emailVerified: false,
        },
      });

      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: createdUser.id,
          providerId: "credential",
          userId: createdUser.id,
          password: hashedPassword,
        },
      });
    });

    return res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({ message: "Internal server error registration failed" });
  }
};

export const applyDeliveryMan = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      nidNumber,
      licenseNumber,
      vehicleType,
      vehicleRegistrationNo,
      deliveryArea,
      currentAddress,
      emergencyContactName,
      emergencyContactPhone,
    } = req.body;

    const requiredFields = [
      name,
      email,
      password,
      phone,
      nidNumber,
      licenseNumber,
      vehicleType,
      vehicleRegistrationNo,
      deliveryArea,
      currentAddress,
      emergencyContactName,
      emergencyContactPhone,
    ];

    if (requiredFields.some((field) => !field || String(field).trim().length === 0)) {
      return res.status(400).json({ message: "All delivery man application fields are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existinguser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existinguser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await hashPassword(String(password));

    await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: String(name).trim(),
          email: normalizedEmail,
          role: "DELIVERY_MAN",
          status: "PENDING_APPROVAL",
          emailVerified: false,
        },
      });

      await tx.account.create({
        data: {
          id: randomUUID(),
          accountId: createdUser.id,
          providerId: "credential",
          userId: createdUser.id,
          password: hashedPassword,
        },
      });

      await tx.deliveryManApplication.create({
        data: {
          userId: createdUser.id,
          phone: String(phone).trim(),
          nidNumber: String(nidNumber).trim(),
          licenseNumber: String(licenseNumber).trim(),
          vehicleType: String(vehicleType).trim(),
          vehicleRegistrationNo: String(vehicleRegistrationNo).trim(),
          deliveryArea: String(deliveryArea).trim(),
          currentAddress: String(currentAddress).trim(),
          emergencyContactName: String(emergencyContactName).trim(),
          emergencyContactPhone: String(emergencyContactPhone).trim(),
        },
      });
    });

    return res.status(201).json({
      message: "Delivery man application submitted. Wait for admin approval before login.",
    });
  } catch (error) {
    console.error("Delivery man application error:", error);
    return res.status(500).json({ message: "Internal server error delivery man application failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: "User is banned" });
    }
    if (user.role === "DELIVERY_MAN" && user.status !== "ACTIVE") {
      return res.status(403).json({
        message: "Your delivery man account is pending admin approval. Please wait for approval.",
      });
    }

    let sessionData;
    try {
      sessionData = await auth.api.signInEmail({
        body: {
          email: normalizedEmail,
          password,
        },
      });
    } catch (signinError) {
      // Backward compatibility: migrate legacy bcrypt hashes to Better Auth hash format.
      const credentialAccount = await prisma.account.findFirst({
        where: {
          userId: user.id,
          providerId: "credential",
        },
        select: {
          id: true,
          password: true,
        },
      });

      const maybeBcryptHash = credentialAccount?.password || "";
      const isBcryptHash = maybeBcryptHash.startsWith("$2a$") || maybeBcryptHash.startsWith("$2b$") || maybeBcryptHash.startsWith("$2y$");

      if (!credentialAccount || !isBcryptHash) {
        throw signinError;
      }

      const isMatch = await bcrypt.compare(password, maybeBcryptHash);
      if (!isMatch) {
        throw signinError;
      }

      const migratedHash = await hashPassword(String(password));
      await prisma.account.update({
        where: { id: credentialAccount.id },
        data: { password: migratedHash },
      });

      sessionData = await auth.api.signInEmail({
        body: {
          email: normalizedEmail,
          password,
        },
      });
    }

    const sessionToken =
      (sessionData as { token?: string })?.token ||
      (sessionData as { session?: { token?: string } })?.session?.token;

    if (!sessionToken) {
      console.error("Login error: Better Auth signInEmail returned no session token", sessionData);
      return res.status(500).json({ message: "Login failed: session token missing" });
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("better-auth.session_token", sessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
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
    const message = error instanceof Error ? error.message : "Login failed";
    const lower = message.toLowerCase();

    if (
      lower.includes("invalid") ||
      lower.includes("credential") ||
      lower.includes("password") ||
      lower.includes("email")
    ) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.status(500).json({
      message:
        process.env.NODE_ENV === "production"
          ? "Internal server error login failed"
          : `Internal server error login failed: ${message}`,
    });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    // Delegate session resolution to Better Auth so that both
    // credential and social (Google) logins are handled consistently.
    const sessionResult = await auth.api.getSession({
      headers: {
        cookie: req.headers.cookie || "",
      },
    });

    const sessionUser = sessionResult?.user;

    if (!sessionUser) {
      return res.status(401).json({ message: "No active session - Please login first" });
    }

    return res.status(200).json({
      user: {
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: (sessionUser as any).role,
        status: (sessionUser as any).status,
        isBanned: (sessionUser as any).isBanned,
        createdAt: (sessionUser as any).createdAt,
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
