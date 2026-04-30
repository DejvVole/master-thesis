import { Request, Response, NextFunction } from "express";
import { z, ZodError, ZodSchema, ZodIssue } from "zod";

// Rozšírenie Request typu pre validované dáta
declare global {
  namespace Express {
    interface Request {
      validatedData?: any;
    }
  }
}

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

const optionalNonNegativeIntFromString = (fieldName: string) =>
  z
    .string()
    .optional()
    .refine((val) => !val || (!isNaN(parseInt(val)) && parseInt(val) >= 0), {
      message: `${fieldName} musí byť platné kladné číslo`,
    })
    .transform((val) => (val ? parseInt(val) : undefined));

const optionalShortString = (fieldName: string) =>
  z.string().max(100, `${fieldName} nesmie presiahnuť 100 znakov`).optional();

export const idParamSchema = z.object({
  id: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
      message: "ID musí byť platné kladné číslo",
    })
    .transform((val) => parseInt(val)),
});

export const filterQuerySchema = z.object({
  rokVystavbyOd: optionalNonNegativeIntFromString("rokVystavbyOd"),
  rokVystavbyDo: optionalNonNegativeIntFromString("rokVystavbyDo"),
  typStrechy: optionalShortString("typStrechy"),
  materialFasady: optionalShortString("materialFasady"),
  materialInterieru: optionalShortString("materialInterieru"),
  aktualnyStav: optionalShortString("aktualnyStav"),
  obdobie: optionalShortString("obdobie"),
});

export const searchBodySchema = z.object({
  query: z
    .string()
    .min(1, "Query je povinný")
    .max(1000, "Query nesmie presiahnuť 1000 znakov")
    .trim(),
});

export const buildingIdParamSchema = idParamSchema;
export const documentIdParamSchema = idParamSchema;

export const uploadBodySchema = z.object({
  enableInference: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

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

export type FilterQuery = z.infer<typeof filterQuerySchema>;
export type SearchBody = z.infer<typeof searchBodySchema>;
export type IdParam = z.infer<typeof idParamSchema>;
// Aliasy pre kompatibilitu so starým kódom.
export type BuildingIdParam = IdParam;
export type DocumentIdParam = IdParam;
export type UploadBody = z.infer<typeof uploadBodySchema>;
export type SessionIdParam = z.infer<typeof sessionIdParamSchema>;
