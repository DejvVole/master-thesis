import { Router, Request, Response } from "express";
import { auth } from "../lib/auth";
import { toNodeHandler } from "better-auth/node";

const router = Router();

router.all("/*splat", (req: Request, res: Response) => {
  return toNodeHandler(auth)(req, res);
});

export default router;
