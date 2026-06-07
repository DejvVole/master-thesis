import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema, ZodIssue } from "zod";

declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

/**
 * Middleware for validating request body, query or params using Zod schema.
 * Validated data is available at req.validatedData
 */
export const validate =
  (schema: ZodSchema, source: "body" | "query" | "params" = "body") =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      req.validatedData = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.issues.map((err: ZodIssue) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        return res.status(400).json({
          error: "Validation failed",
          details: formattedErrors,
        });
      }
      next(error);
    }
  };

// ============================================
// BUILDINGS SCHEMAS
// ============================================

// Filter query params
export const filterQuerySchema = z.object({
  rokVystavbyOd: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 0), {
      message: "rokVystavbyOd musí byť platné kladné číslo",
    })
    .transform((val) => (val ? parseInt(val) : undefined)),
  rokVystavbyDo: z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 0), {
      message: "rokVystavbyDo musí byť platné kladné číslo",
    })
    .transform((val) => (val ? parseInt(val) : undefined)),
  typStrechy: z
    .string()
    .max(100, "typStrechy nesmie presiahnuť 100 znakov")
    .optional(),
  materialFasady: z
    .string()
    .max(100, "materialFasady nesmie presiahnuť 100 znakov")
    .optional(),
  materialInterieru: z
    .string()
    .max(100, "materialInterieru nesmie presiahnuť 100 znakov")
    .optional(),
  aktualnyStav: z
    .string()
    .max(100, "aktualnyStav nesmie presiahnuť 100 znakov")
    .optional(),
  obdobie: z
    .string()
    .max(100, "obdobie nesmie presiahnuť 100 znakov")
    .optional(),
});

export const searchBodySchema = z.object({
  query: z
    .string()
    .min(1, "Query je povinný")
    .max(1000, "Query nesmie presiahnuť 1000 znakov")
    .trim(),
});

export const buildingIdParamSchema = z.object({
  id: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "ID musí byť platné kladné číslo",
    })
    .transform((val) => parseInt(val)),
});

// ============================================
// ADMIN SCHEMAS
// ============================================

// Document ID param
export const documentIdParamSchema = z.object({
  id: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "ID musí byť platné kladné číslo",
    })
    .transform((val) => parseInt(val)),
});

// ============================================
// UPLOAD SCHEMAS
// ============================================

// Upload body (multipart form data - enableInference flag)
export const uploadBodySchema = z.object({
  enableInference: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

// Session ID param for progress tracking
export const sessionIdParamSchema = z.object({
  sessionId: z
    .string()
    .min(1, "Session ID je povinný")
    .max(100, "Session ID nesmie presiahnuť 100 znakov")
    .regex(
      /^[a-zA-Z0-9\-_]+$/,
      "Session ID môže obsahovať len písmená, čísla, pomlčky a podčiarkovníky",
    ),
});

// ============================================
// HELPER TYPES
// ============================================

export type FilterQuery = z.infer<typeof filterQuerySchema>;
export type SearchBody = z.infer<typeof searchBodySchema>;
export type BuildingIdParam = z.infer<typeof buildingIdParamSchema>;
export type DocumentIdParam = z.infer<typeof documentIdParamSchema>;
export type UploadBody = z.infer<typeof uploadBodySchema>;
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
