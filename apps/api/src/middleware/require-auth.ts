import { Request, Response, NextFunction } from "express";
import { auth } from "../modules/auth/auth.js";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      session?: {
        id: string;
        userId: string;
        expiresAt: Date;
      };
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({
    headers: req.headers as unknown as Headers,
  });

  if (!session || !session.session || !session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  req.session = {
    id: session.session.id,
    userId: session.session.userId,
    expiresAt: session.session.expiresAt,
  };

  req.user = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: (session.user.role as "ADMIN" | "STAFF" | "CUSTOMER") || "CUSTOMER",
  };

  next();
}
