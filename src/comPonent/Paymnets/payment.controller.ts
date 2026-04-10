import { Request, Response } from "express";
import type { AuthRequest } from "../../tyPes/index.js";
import * as paymentService from "./paymnet.service.js";

export const createCheckoutSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "No items provided" });
      return;
    }

    const session = await paymentService.createCheckoutSessionService(items);
    res.status(200).json({ success: true, url: session.url });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || "Payment session failed" });
  }
};

export const initPayment = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { medicineId } = req.body as { medicineId?: string };

    if (!medicineId) {
      res.status(400).json({ message: "medicineId is required" });
      return;
    }

    const result = await paymentService.initPayment(req.user!.id, medicineId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const handleWebhook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const sig = req.headers["stripe-signature"] as string;
    const payload = req.body as Buffer;
    const result = await paymentService.handleWebhook(payload, sig);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const verifySession = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const sessionId = (req.query.sessionId as string) || "";
    const result = await paymentService.verifySession(sessionId, req.user!.id);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const checkAccess = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const { medicineId } = req.params as { medicineId: string };
    const result = await paymentService.checkAccess(medicineId, req.user!.id);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const getAllPaymentsForAdmin = async (
  _req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const result = await paymentService.getAllPaymentsForAdmin();
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch payments";
    res.status(500).json({ success: false, message });
  }
};

export const getMyPurchasedMedicines = async (
  req: AuthRequest,
  res: Response,
): Promise<void> => {
  try {
    const result = await paymentService.getMyPurchasedMedicines(req.user!.id);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch purchased medicines";
    res.status(500).json({ success: false, message });
  }
};