import { Router } from "express";
import { db } from "../db";
import {
  buildings_info,
  buildingsInfoSources,
  buildingsNormalizedValues,
  normalizedValueOptions,
  sourceDocuments,
} from "../db/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { getMinioPresignedUrl } from "../services/minioService";
import { searchBuildings } from "../services/searchService";
import {
  validate,
  filterQuerySchema,
  searchBodySchema,
  buildingIdParamSchema,
  FilterQuery,
} from "../middleware/validation";

const router = Router();

const FILTER_OPTION_CATEGORIES = [
  { dbCategory: "typ_strechy", responseKey: "typyStrechy" },
  { dbCategory: "material_fasady", responseKey: "materialyFasady" },
  { dbCategory: "material_interieru", responseKey: "materialyInterieru" },
  { dbCategory: "aktualny_stav", responseKey: "stavy" },
  { dbCategory: "obdobie", responseKey: "obdobia" },
] as const;

async function fetchFilterOptions(dbCategory: string) {
  const rows = await db
    .select({
      value: normalizedValueOptions.value,
      label: normalizedValueOptions.displayLabel,
    })
    .from(normalizedValueOptions)
    .where(
      and(
        eq(normalizedValueOptions.category, dbCategory),
        eq(normalizedValueOptions.isActive, true),
      ),
    )
    .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

  return rows.map((r) => ({ value: r.value, label: r.label || r.value }));
}

router.get("/", async (req, res) => {
  try {
    const buildings = await db
      .select()
      .from(buildings_info)
      .where(eq(buildings_info.isHidden, false))
      .orderBy(desc(buildings_info.createdAt));
    res.json(buildings);
  } catch (error) {
    console.error("Error fetching buildings:", error);
    res.status(500).json({ error: "Failed to fetch buildings" });
  }
});

router.get("/filter-options", async (req, res) => {
  try {
    const results = await Promise.all(
      FILTER_OPTION_CATEGORIES.map((c) => fetchFilterOptions(c.dbCategory)),
    );

    const response = Object.fromEntries(
      FILTER_OPTION_CATEGORIES.map((c, i) => [c.responseKey, results[i]]),
    );

    res.json(response);
  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

router.get(
  "/filter",
  validate(filterQuerySchema, "query"),
  async (req, res) => {
    try {
      const {
        rokVystavbyOd,
        rokVystavbyDo,
        typStrechy,
        materialFasady,
        materialInterieru,
        aktualnyStav,
        obdobie,
      } = req.validatedData as FilterQuery;

      let buildingIdsFromFilters: number[][] = [];

      const getBuildingIdsByCategory = async (
        category: string,
        value: string,
      ): Promise<number[]> => {
        const results = await db
          .select({ buildingId: buildingsNormalizedValues.buildingId })
          .from(buildingsNormalizedValues)
          .innerJoin(
            normalizedValueOptions,
            and(
              eq(
                buildingsNormalizedValues.normalizedOptionId,
                normalizedValueOptions.id,
              ),
              eq(normalizedValueOptions.category, category),
              eq(normalizedValueOptions.value, value),
            ),
          );
        return results.map((r) => r.buildingId);
      };

      if (typStrechy) {
        const ids = await getBuildingIdsByCategory("typ_strechy", typStrechy);
        buildingIdsFromFilters.push(ids);
      }

      if (materialFasady) {
        const ids = await getBuildingIdsByCategory(
          "material_fasady",
          materialFasady,
        );
        buildingIdsFromFilters.push(ids);
      }

      if (materialInterieru) {
        const ids = await getBuildingIdsByCategory(
          "material_interieru",
          materialInterieru,
        );
        buildingIdsFromFilters.push(ids);
      }

      if (aktualnyStav) {
        const ids = await getBuildingIdsByCategory(
          "aktualny_stav",
          aktualnyStav,
        );
        buildingIdsFromFilters.push(ids);
      }

      if (obdobie) {
        const ids = await getBuildingIdsByCategory("obdobie", obdobie);
        buildingIdsFromFilters.push(ids);
      }

      let validBuildingIds: number[] | null = null;

      if (buildingIdsFromFilters.length > 0) {
        validBuildingIds = buildingIdsFromFilters[0];
        for (let i = 1; i < buildingIdsFromFilters.length; i++) {
          const currentSet = new Set(buildingIdsFromFilters[i]);
          validBuildingIds = validBuildingIds.filter((id) =>
            currentSet.has(id),
          );
        }
      }

      const conditions = [eq(buildings_info.isHidden, false)];

      if (validBuildingIds !== null) {
        if (validBuildingIds.length === 0) {
          return res.json([]);
        }
        conditions.push(inArray(buildings_info.id, validBuildingIds));
      }

      if (rokVystavbyOd !== undefined) {
        conditions.push(
          gte(buildings_info.rokVystavbyNormalized, rokVystavbyOd),
        );
      }
      if (rokVystavbyDo !== undefined) {
        conditions.push(
          lte(buildings_info.rokVystavbyNormalized, rokVystavbyDo),
        );
      }

      const buildings = await db
        .select()
        .from(buildings_info)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(buildings_info.createdAt));

      res.json(buildings);
    } catch (error) {
      console.error("Error filtering buildings:", error);
      res.status(500).json({ error: "Failed to filter buildings" });
    }
  },
);

router.post("/search", validate(searchBodySchema, "body"), async (req, res) => {
  try {
    const { query } = req.validatedData as { query: string };
    const results = await searchBuildings(query);
    res.json(results);
  } catch (error) {
    console.error("Error in semantic search:", error);
    res.status(500).json({ error: "Failed to perform semantic search" });
  }
});

router.get(
  "/:id",
  validate(buildingIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id } = req.validatedData as { id: number };

      const building = await db
        .select()
        .from(buildings_info)
        .where(eq(buildings_info.id, id))
        .limit(1);

      if (!building.length) {
        return res.status(404).json({ error: "Building not found" });
      }

      res.json(building[0]);
    } catch (error) {
      console.error("Error fetching building:", error);
      res.status(500).json({ error: "Failed to fetch building" });
    }
  },
);

router.get(
  "/:id/document",
  validate(buildingIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id } = req.validatedData as { id: number };

      const building = await db
        .select()
        .from(buildings_info)
        .where(eq(buildings_info.id, id))
        .limit(1);

      if (!building.length || !building[0].sourceDocumentId) {
        return res.status(404).json({ error: "Source document not found" });
      }

      const document = await db
        .select()
        .from(sourceDocuments)
        .where(eq(sourceDocuments.id, building[0].sourceDocumentId))
        .limit(1);

      if (!document.length) {
        return res.status(404).json({ error: "Source document not found" });
      }

      res.json(document[0]);
    } catch (error) {
      console.error("Error fetching source document:", error);
      res.status(500).json({ error: "Failed to fetch source document" });
    }
  },
);

router.get(
  "/:id/pdf-url",
  validate(buildingIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id } = req.validatedData as { id: number };

      const building = await db
        .select()
        .from(buildings_info)
        .where(eq(buildings_info.id, id))
        .limit(1);

      if (!building.length || !building[0].sourceDocumentId) {
        return res.status(404).json({ error: "Building not found" });
      }

      const document = await db
        .select()
        .from(sourceDocuments)
        .where(eq(sourceDocuments.id, building[0].sourceDocumentId))
        .limit(1);

      if (!document.length || !document[0].filePath) {
        return res.status(404).json({ error: "PDF document not found" });
      }

      const url = await getMinioPresignedUrl(document[0].filePath);

      res.json({ url });
    } catch (error) {
      console.error("Error generating PDF URL:", error);
      res.status(500).json({ error: "Failed to generate PDF URL" });
    }
  },
);

router.get(
  "/:id/sources",
  validate(buildingIdParamSchema, "params"),
  async (req, res) => {
    try {
      const { id } = req.validatedData as { id: number };

      const sources = await db
        .select()
        .from(buildingsInfoSources)
        .where(eq(buildingsInfoSources.budovaId, id));

      res.json(sources);
    } catch (error) {
      console.error("Error fetching source metadata:", error);
      res.status(500).json({ error: "Failed to fetch source metadata" });
    }
  },
);

export default router;
