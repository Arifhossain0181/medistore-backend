import { Request, Response } from "express";
import { prisma } from "../../lib/prisma.js";
import { sendMessage } from "./chat.service.js";

export const handleMessage = async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "messages array required",
    });
  }

  const validMessages = messages.filter(
    (m: any) =>
      ["user", "assistant"].includes(m.role) &&
      typeof m.content === "string" &&
      m.content.trim().length > 0
  );

  if (validMessages.length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid messages found",
    });
  }

  let user: { id: string; role: string } | null = null;

  try {
    const sessionToken = (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("better-auth.session_token="))
      ?.split("=")[1];

    const session = sessionToken
      ? await prisma.session.findUnique({
          where: { token: sessionToken },
          select: {
            user: {
              select: {
                id: true,
                role: true,
              },
            },
            expiresAt: true,
          },
        })
      : null;

    user = session && new Date(session.expiresAt) >= new Date() ? (session.user as any) : null;
  } catch (error: any) {
    console.error("Session resolve failed in chat controller:", error?.message || error);
  }

  const reply = await sendMessage(validMessages, user as any);

  return res.status(200).json({
    success: true,
    data: { reply },
  });
};