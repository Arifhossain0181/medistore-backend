import { Request } from "express";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name?: string;
    email?: string;
    role: "CUSTOMER" | "SELLER" | "ADMIN" | "SUPER_ADMIN" | "DELIVERY_MAN";
  };
}
