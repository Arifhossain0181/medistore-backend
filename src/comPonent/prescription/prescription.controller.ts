import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { auth } from "../../lib/auth.js";
import { scanPrescription, scanPrescriptionAndAddToCart } from "./prescription.service.js";

export const handleScan = async (req: Request, res: Response) => {
  const { image } = req.body; // base64 string

  if (!image) {
    return res.status(400).json({
      success: false,
      message: "Image required",
    });
  }

  try {
    const medicines = await scanPrescription(image);
    return res.status(200).json({
      success: true,
      data: { medicines },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Scan failed",
    });
  }
};

export const handleScanAndAddToCart = async (req: Request, res: Response) => {
  const { image } = req.body;

  if (!image) {
    return res.status(400).json({
      success: false,
      message: "Image required",
    });
  }

  try {
    const sessionResult = await auth.api.getSession({
      headers: {
        cookie: req.headers.cookie || "",
      },
    });

    let userId = (sessionResult?.user as any)?.id as string | undefined;

    // Fallback for environments where getSession cannot resolve forwarded cookies.
    if (!userId) {
      const cookieHeader = req.headers.cookie || "";
      const sessionToken = cookieHeader
        .split(";")
        .map((c) => c.trim())
        .find(
          (c) =>
            c.startsWith("better-auth.session_token=") ||
            c.startsWith("__Secure-better-auth.session_token=") ||
            c.startsWith("__Host-better-auth.session_token="),
        )
        ?.split("=")
        .slice(1)
        .join("=");

      if (sessionToken) {
        const session = await prisma.session.findUnique({
          where: { token: sessionToken },
          select: {
            user: { select: { id: true } },
            expiresAt: true,
          },
        });

        userId = session && new Date(session.expiresAt) >= new Date() ? session.user.id : undefined;
      }
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    const result = await scanPrescriptionAndAddToCart(userId, image);
    return res.status(200).json({
      success: true,
      message: "Prescription scanned and matched medicines added to cart",
      data: result,
    });
  } catch (error: any) {
    const message = error?.message || "Scan and add failed";
    console.error("Prescription scan-and-add error:", message);
    return res.status(500).json({
      success: false,
      message,
    });
  }
};