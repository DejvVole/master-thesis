import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

// Typy pre role
type UserRole = "user" | "admin";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image?: string | null;
        role: UserRole;
        banned?: boolean;
        banReason?: string | null;
        banExpires?: Date | null;
        createdAt: Date;
        updatedAt: Date;
      };
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
      };
    }
  }
}

/**
 * Authentication middleware.
 * Adds user and session to the req object.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({
        error: "Neautorizovaný prístup",
        message: "Pre prístup k tomuto zdroju sa musíte prihlásiť",
      });
    }

    if (session.user.banned) {
      return res.status(403).json({
        error: "Účet zablokovaný",
        message: session.user.banReason || "Váš účet bol zablokovaný",
      });
    }

    req.user = session.user as Request["user"];
    req.session = session.session;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(401).json({
      error: "Chyba autentifikácie",
      message: "Neplatná alebo expirovaná session",
    });
  }
};

/**
 * Admin role middleware.
 * Must be used after requireAuth.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Neautorizovaný prístup",
      message: "Pre prístup k tomuto zdroju sa musíte prihlásiť",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Nedostatočné oprávnenia",
      message: "Pre túto akciu potrebujete admin oprávnenia",
    });
  }

  next();
};

/**
 * Optional authentication - does not require login,
 * but if user is logged in, adds them to req
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session && !session.user.banned) {
      req.user = session.user as Request["user"];
      req.session = session.session;
    }
    next();
  } catch (error) {
    // On error, continue without authentication
    next();
  }
};
