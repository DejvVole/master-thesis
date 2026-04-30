import { Router } from "express";
import { db } from "../db";
import {
  buildings_info,
  sourceDocuments,
  buildingsInfoSources,
} from "../db/schema";
import { eq, desc, sql, and, asc } from "drizzle-orm";
import { validate, documentIdParamSchema } from "../middleware/validation";
import { snakeToCamel, getFieldLabel } from "../utils/caseConverter";

const router = Router();

router.get("/documents", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: sourceDocuments.id,
        fileName: sourceDocuments.fileName,
        filePath: sourceDocuments.filePath,
        metadata: sourceDocuments.metadata,
        processedDate: sourceDocuments.processedDate,
        createdAt: sourceDocuments.createdAt,
        isHidden: sourceDocuments.isHidden,
        buildingId: buildings_info.id,
        buildingName: buildings_info.menoBudovy,
        buildingHidden: buildings_info.isHidden,
      })
      .from(sourceDocuments)
      .leftJoin(
        buildings_info,
        eq(buildings_info.sourceDocumentId, sourceDocuments.id),
      )
      .orderBy(desc(sourceDocuments.createdAt));

    const documents = rows.map((row) => {
      const metadata = (row.metadata ?? {}) as Record<string, unknown>;
      return {
        id: row.id,
        fileName: row.fileName,
        filePath: row.filePath,
        metadata: row.metadata,
        processedDate: row.processedDate,
        createdAt: row.createdAt,
        isHidden: row.isHidden,
        inferenceEnabled: (metadata.inference_status as boolean) ?? false,
        extractedCount: (metadata.extracted_count as number) ?? 0,
        inferredCount: (metadata.inferred_count as number) ?? 0,
        missingCount: (metadata.missing_count as number) ?? 0,
        building: row.buildingId
          ? {
              id: row.buildingId,
              menoBudovy: row.buildingName,
              isHidden: row.buildingHidden,
            }
          : null,
      };
    });

    res.json(documents);
  } catch (error) {
    console.error("Error fetching admin documents:", error);
    res.status(500).json({ error: "Failed to fetch documents" });
  }
});

router.patch(
  "/documents/:id/toggle-visibility",
  validate(documentIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id: documentId } = req.validatedData as { id: number };

      const current = await db
        .select({ isHidden: sourceDocuments.isHidden })
        .from(sourceDocuments)
        .where(eq(sourceDocuments.id, documentId))
        .limit(1);

      if (!current.length) {
        return res.status(404).json({ error: "Document not found" });
      }

      const newHiddenState = !current[0].isHidden;

      await db
        .update(sourceDocuments)
        .set({ isHidden: newHiddenState })
        .where(eq(sourceDocuments.id, documentId));

      await db
        .update(buildings_info)
        .set({ isHidden: newHiddenState })
        .where(eq(buildings_info.sourceDocumentId, documentId));

      res.json({
        success: true,
        isHidden: newHiddenState,
        message: newHiddenState ? "Document hidden" : "Document visible",
      });
    } catch (error) {
      console.error("Error toggling document visibility:", error);
      res.status(500).json({ error: "Failed to toggle visibility" });
    }
  },
);

// DELETE document completely
router.delete(
  "/documents/:id",
  validate(documentIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id: documentId } = req.validatedData as { id: number };

      await db.transaction(async (tx) => {
        await tx
          .delete(buildings_info)
          .where(eq(buildings_info.sourceDocumentId, documentId));

        await tx
          .delete(sourceDocuments)
          .where(eq(sourceDocuments.id, documentId));
      });

      res.json({ success: true, message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  },
);

// GET admin statistics
router.get("/stats", async (req, res) => {
  try {
    const [totalDocsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sourceDocuments);

    const [hiddenDocsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sourceDocuments)
      .where(eq(sourceDocuments.isHidden, true));

    const [totalBuildingsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buildings_info);

    const [hiddenBuildingsResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(buildings_info)
      .where(eq(buildings_info.isHidden, true));

    const [inferenceEnabledResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(sourceDocuments)
      .where(
        sql`(${sourceDocuments.metadata}->>'inference_status')::boolean = true`,
      );

    const totalDocuments = totalDocsResult.count;
    const hiddenDocuments = hiddenDocsResult.count;
    const totalBuildings = totalBuildingsResult.count;
    const hiddenBuildings = hiddenBuildingsResult.count;
    const inferenceEnabled = inferenceEnabledResult.count;

    res.json({
      totalDocuments,
      hiddenDocuments,
      visibleDocuments: totalDocuments - hiddenDocuments,
      totalBuildings,
      hiddenBuildings,
      inferenceEnabled,
      inferenceDisabled: totalDocuments - inferenceEnabled,
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

router.get(
  "/buildings/:id/sources",
  validate(documentIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id: buildingId } = req.validatedData as { id: number };

      // Get sources metadata
      const sources = await db
        .select()
        .from(buildingsInfoSources)
        .where(eq(buildingsInfoSources.budovaId, buildingId))
        .orderBy(asc(buildingsInfoSources.id));

      // Get building info to include actual values
      const building = await db
        .select()
        .from(buildings_info)
        .where(eq(buildings_info.id, buildingId))
        .limit(1);

      if (!building.length) {
        return res.status(404).json({ error: "Building not found" });
      }

      const buildingData = building[0] as Record<string, any>;

      // Map sources with their values - return fieldName in camelCase for frontend consistency
      const sourcesWithValues = sources.map((source) => {
        const camelFieldName = snakeToCamel(source.fieldName);
        // Parse originalSourceType from reasoning if it was edited
        let originalSourceType = null;
        if (source.sourceType === "EDITED" && source.reasoning) {
          const match = source.reasoning.match(
            /Pôvodný typ: (EXTRACTED|INFERRED|MISSING)/,
          );
          if (match) {
            originalSourceType = match[1];
          }
        }
        return {
          id: source.id,
          fieldName: camelFieldName, // Always return camelCase to frontend
          fieldNameSnake: source.fieldName, // Keep original for reference
          label: getFieldLabel(source.fieldName), // Slovak display label
          sourceType: source.sourceType,
          confidence: source.confidence,
          reasoning: source.reasoning,
          value: buildingData[camelFieldName] ?? null,
          originalSourceType,
        };
      });

      res.json(sourcesWithValues);
    } catch (error) {
      console.error("Error fetching building sources:", error);
      res.status(500).json({ error: "Failed to fetch building sources" });
    }
  },
);

// Allowed fields that can be edited via admin PATCH
const EDITABLE_FIELDS = new Set([
  "menoBudovy",
  "adresa",
  "gpsSuradnice",
  "rokVystavby",
  "aktualnyVlastnik",
  "rokZaradenia",
  "historickyVyznam",
  "zaznamyOObnove",
  "materialVonkajsejFasady",
  "typStrechy",
  "materialInterieru",
  "ineMaterialy",
  "aktualnyStav",
  "kritickeMiesta",
  "potrebneSanacie",
  "sucasneFotografie",
  "historickeFotografie",
  "planyASchemy",
  "harmonogramUdrzby",
  "revizneZaznamy",
  "ochranneZony",
  "povoleniaNaZasahy",
  "legislativneObmedzenia",
  "digitalneVykresy",
  "archeologickeVyskumy",
  "chemickeAnalyzy",
]);

// PATCH update source value
router.patch("/buildings/:buildingId/sources/:sourceId", async (req, res) => {
  try {
    const buildingId = parseInt(req.params.buildingId);
    const sourceId = parseInt(req.params.sourceId);
    const { fieldName, newValue } = req.body;

    if (isNaN(buildingId) || isNaN(sourceId)) {
      return res.status(400).json({ error: "Invalid IDs" });
    }

    if (!fieldName || newValue === undefined) {
      return res.status(400).json({ error: "Missing fieldName or newValue" });
    }

    if (!EDITABLE_FIELDS.has(fieldName)) {
      return res.status(400).json({ error: "Invalid field name" });
    }

    // Get the source to get original type
    const source = await db
      .select()
      .from(buildingsInfoSources)
      .where(eq(buildingsInfoSources.id, sourceId))
      .limit(1);

    if (!source.length) {
      return res.status(404).json({ error: "Source not found" });
    }

    const originalSource = source[0];

    // Get building to verify it exists
    const building = await db
      .select()
      .from(buildings_info)
      .where(eq(buildings_info.id, buildingId))
      .limit(1);

    if (!building.length) {
      return res.status(404).json({ error: "Building not found" });
    }

    // Convert camelCase fieldName to snake_case for DB column
    const snakeFieldName = fieldName.replace(
      /[A-Z]/g,
      (letter: string) => `_${letter.toLowerCase()}`,
    );

    // Update the building field value
    await db
      .update(buildings_info)
      .set({ [fieldName]: newValue, updatedAt: new Date() })
      .where(eq(buildings_info.id, buildingId));

    // Store original source type in reasoning if not already edited
    let newReasoning = originalSource.reasoning;
    if (originalSource.sourceType !== "EDITED") {
      newReasoning =
        `Pôvodný typ: ${originalSource.sourceType}. ${originalSource.reasoning || ""}`.trim();
    }

    // Update source type to EDITED
    await db
      .update(buildingsInfoSources)
      .set({
        sourceType: "EDITED",
        reasoning: newReasoning,
      })
      .where(eq(buildingsInfoSources.id, sourceId));

    // Update document metadata to mark as edited
    const sourceDocument = await db
      .select({ id: sourceDocuments.id, metadata: sourceDocuments.metadata })
      .from(sourceDocuments)
      .innerJoin(
        buildings_info,
        eq(buildings_info.sourceDocumentId, sourceDocuments.id),
      )
      .where(eq(buildings_info.id, buildingId))
      .limit(1);

    if (sourceDocument.length) {
      const currentMetadata = (sourceDocument[0].metadata as any) || {};
      await db
        .update(sourceDocuments)
        .set({
          metadata: {
            ...currentMetadata,
            manually_edited: true,
            last_edited_at: new Date().toISOString(),
          },
        })
        .where(eq(sourceDocuments.id, sourceDocument[0].id));
    }

    // Return updated source
    const camelFieldName = snakeToCamel(snakeFieldName);
    res.json({
      id: sourceId,
      fieldName: camelFieldName,
      fieldNameSnake: snakeFieldName,
      label: getFieldLabel(snakeFieldName),
      sourceType: "EDITED",
      confidence: originalSource.confidence,
      reasoning: newReasoning,
      value: newValue,
      originalSourceType:
        originalSource.sourceType !== "EDITED"
          ? originalSource.sourceType
          : null,
    });
  } catch (error) {
    console.error("Error updating source value:", error);
    res.status(500).json({ error: "Failed to update source value" });
  }
});

export default router;
