import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { db } from "../db";
import { sourceDocuments } from "../db/schema";
import { eq } from "drizzle-orm";
import { uploadDocumentToMinio } from "../services/minioService";
import { runRagPipelineWithProgress } from "../services/pythonService";
import { validate, sessionIdParamSchema } from "../middleware/validation";
import { calculateFileHash } from "../utils/fileHash";
import { normalizePossibleMojibake } from "../utils/filenameEncoding";

const router = Router();

const uploadSessions = new Map<
  string,
  {
    status: "pending" | "processing" | "complete" | "error";
    progress: number;
    message: string;
    detail?: string;
    stage?: string;
    currentCategory?: number;
    totalCategories?: number;
    error?: string;
    result?: any;
    cancel?: () => void;
  }
>();

const upload = multer({
  storage: multer.diskStorage({
    destination: "/tmp/uploads/",
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
    }
  },
});

router.get(
  "/progress/:sessionId",
  validate(sessionIdParamSchema, "params"),
  (req, res) => {
    const { sessionId } = req.params;
    const origin = req.headers.origin;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");

    const session = uploadSessions.get(sessionId);
    if (session) {
      res.write(`data: ${JSON.stringify(session)}\n\n`);
    } else {
      res.write(
        `data: ${JSON.stringify({
          status: "pending",
          progress: 0,
          message: "Čakám na spracovanie...",
        })}\n\n`,
      );
    }

    const intervalId = setInterval(() => {
      const currentSession = uploadSessions.get(sessionId);
      if (currentSession) {
        res.write(`data: ${JSON.stringify(currentSession)}\n\n`);

        if (
          currentSession.status === "complete" ||
          currentSession.status === "error"
        ) {
          clearInterval(intervalId);
          setTimeout(() => {
            uploadSessions.delete(sessionId);
          }, 5000);
        }
      }
    }, 500);

    req.on("close", () => {
      clearInterval(intervalId);
    });
  },
);

router.post("/", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const uploadedFile = req.file;
  const originalName = normalizePossibleMojibake(uploadedFile.originalname);
  const enableInference = req.body.enableInference === "true";

  const sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  try {
    console.log(`🔍 Computing file hash for '${originalName}'...`);

    const fileHash = await calculateFileHash(uploadedFile.path);
    console.log(`   Hash: ${fileHash}`);

    const existingByHash = await db
      .select()
      .from(sourceDocuments)
      .where(eq(sourceDocuments.fileHash, fileHash))
      .limit(1);

    if (existingByHash.length > 0) {
      console.log(
        `⚠️  File with same content already exists (original: '${existingByHash[0].fileName}')!`,
      );
      await fs.unlink(uploadedFile.path);

      return res.status(409).json({
        error: "File already processed",
        message: `Dokument s rovnakým obsahom už bol spracovaný.`,
        detail: `Pôvodný súbor: "${existingByHash[0].fileName}"`,
        existingDocument: {
          id: existingByHash[0].id,
          fileName: existingByHash[0].fileName,
          processedDate: existingByHash[0].processedDate,
          minioObject: existingByHash[0].filePath,
        },
      });
    }

    uploadSessions.set(sessionId, {
      status: "processing",
      progress: 0,
      message: "Začínam spracovanie...",
      stage: "upload",
    });

    console.log(`✓ File is new, proceeding with upload...`);
    console.log(`📤 Uploading ${originalName} to MinIO...`);
    console.log(`   Temp file: ${uploadedFile.path}`);

    uploadSessions.set(sessionId, {
      status: "processing",
      progress: 2,
      message: "Nahrávam súbor do úložiska...",
      stage: "upload",
    });

    const minioObjectName = `${Date.now()}_${originalName}`;
    await uploadDocumentToMinio(uploadedFile.path, minioObjectName);

    console.log(`✓ Uploaded to MinIO: ${minioObjectName}`);
    console.log(`🐍 Starting Python RAG pipeline...`);

    res.json({
      success: true,
      sessionId,
      message: "Processing started",
      fileName: originalName,
    });

    try {
      const { promise: pipelinePromise, cancel } = runRagPipelineWithProgress(
        uploadedFile.path,
        originalName,
        minioObjectName,
        enableInference,
        (progressData) => {
          const existing = uploadSessions.get(sessionId);
          uploadSessions.set(sessionId, {
            ...existing,
            status: "processing",
            progress: progressData.progress,
            message: progressData.message,
            detail: progressData.detail,
            stage: progressData.stage,
            currentCategory: progressData.current_category,
            totalCategories: progressData.total_categories,
          });
        },
        fileHash, // Pass hash to Python pipeline
      );

      // Store cancel so the DELETE endpoint can kill the process
      const existing = uploadSessions.get(sessionId);
      if (existing) existing.cancel = cancel;

      await pipelinePromise;

      // If the run was cancelled, the DELETE endpoint already updated the
      // session — don't overwrite it with "complete".
      const currentSession = uploadSessions.get(sessionId);
      if (!currentSession || currentSession.status !== "processing") {
        await fs.unlink(uploadedFile.path).catch(() => {});
        return;
      }

      console.log(`✓ RAG pipeline completed`);

      uploadSessions.set(sessionId, {
        status: "complete",
        progress: 100,
        message: "Spracovanie dokončené!",
        stage: "complete",
        result: {
          fileName: originalName,
          minioObject: minioObjectName,
          inferenceEnabled: enableInference,
        },
      });

      await fs.unlink(uploadedFile.path);
    } catch (pipelineError: any) {
      console.error("Pipeline error:", pipelineError);

      uploadSessions.set(sessionId, {
        status: "error",
        progress: 0,
        message: "Chyba pri spracovaní",
        error: pipelineError.message,
        stage: "error",
      });

      try {
        await fs.unlink(uploadedFile.path);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }
  } catch (error: any) {
    console.error("Upload/processing error:", error);

    uploadSessions.set(sessionId, {
      status: "error",
      progress: 0,
      message: "Chyba pri nahrávaní",
      error: error.message,
      stage: "error",
    });

    try {
      await fs.unlink(uploadedFile.path);
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }

    if (!res.headersSent) {
      res.status(500).json({
        error: "Failed to process file",
        details: error.message,
      });
    }
  }
});

router.delete(
  "/:sessionId",
  validate(sessionIdParamSchema, "params"),
  (req, res) => {
    const { sessionId } = req.params;
    const session = uploadSessions.get(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.cancel) {
      session.cancel();
    }

    uploadSessions.set(sessionId, {
      ...session,
      status: "error",
      message: "Spracovanie zrušené",
      stage: "error",
      cancel: undefined,
    });

    return res.json({ success: true, message: "Processing cancelled" });
  },
);

export default router;
