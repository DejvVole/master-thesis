import { Router, Request, Response } from "express";
import { auth } from "../lib/auth";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Better Auth handler - spracúva všetky auth endpointy
// Cesty: /api/auth/sign-up, /api/auth/sign-in, /api/auth/sign-out, atď.
router.all("/*splat", (req: Request, res: Response) => {
  return toNodeHandler(auth)(req, res);
});

export default router;
