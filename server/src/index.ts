import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import buildingsRouter from "./routes/buildings";
import uploadRouter from "./routes/upload";
import adminRouter from "./routes/admin";
import authRouter from "./routes/auth";
import invitationRouter, {
  verifyTokenHandler,
  acceptInvitationHandler,
} from "./routes/invitation";
import { ensureBucketExists } from "./services/minioService";
import { requireAuth, requireAdmin } from "./middleware/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS - allow specific origins, set in environment variable
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (e.g., curl, Postman) only in dev mode
      if (!origin && process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      if (origin && allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("CORS policy: Origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Príliš veľa requestov, skúste znova neskôr." },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Príliš veľa requestov na túto operáciu, skúste znova neskôr.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);
app.use(express.json());

ensureBucketExists().catch(console.error);

app.use("/api/auth", authRouter);

app.use(
  "/api/buildings/upload",
  requireAuth,
  requireAdmin,
  strictLimiter,
  uploadRouter,
);

app.use("/api/buildings", requireAuth, buildingsRouter);

app.use("/api/admin", requireAuth, requireAdmin, strictLimiter, adminRouter);

app.get("/api/invitation/verify/:token", verifyTokenHandler);
app.post("/api/invitation/accept", acceptInvitationHandler);

app.use(
  "/api/invitation",
  requireAuth,
  requireAdmin,
  strictLimiter,
  invitationRouter,
);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Global error handler
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err.message);
    res.status(500).json({
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  },
);

app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
  console.log(`✓ API: http://localhost:${PORT}/api`);
  console.log(`✓ CORS origins: ${allowedOrigins.join(", ")}`);
});
