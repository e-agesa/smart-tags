import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UserJwtPayload, AdminJwtPayload } from "../types";

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserJwtPayload;
      admin?: AdminJwtPayload;
    }
  }
}

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as UserJwtPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.token;
  if (!token) {
    next();
    return;
  }
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as UserJwtPayload;
    req.user = payload;
  } catch {
    // Invalid token — proceed without auth
  }
  next();
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.cookies?.admin_token;
  if (!token) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  try {
    const payload = jwt.verify(
      token,
      env.JWT_ADMIN_SECRET
    ) as AdminJwtPayload;
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired admin token" });
  }
}
