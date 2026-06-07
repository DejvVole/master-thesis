import { Router } from "express";
import { db, pool } from "../db";
import {
  buildings_info,
  buildingsInfoSources,
  buildingsNormalizedValues,
  normalizedValueOptions,
  sourceDocuments,
} from "../db/schema";
import { eq, desc, and, gte, lte, inArray } from "drizzle-orm";
import { getMinioPresignedUrl } from "../services/minioService";
import {
  validate,
  filterQuerySchema,
  searchBodySchema,
  buildingIdParamSchema,
  FilterQuery,
} from "../middleware/validation";

const router = Router();

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
    const typyStrechy = await db
      .select({
        value: normalizedValueOptions.value,
        label: normalizedValueOptions.displayLabel,
        sortOrder: normalizedValueOptions.sortOrder,
      })
      .from(normalizedValueOptions)
      .where(
        and(
          eq(normalizedValueOptions.category, "typ_strechy"),
          eq(normalizedValueOptions.isActive, true),
        ),
      )
      .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

    const materialyFasady = await db
      .select({
        value: normalizedValueOptions.value,
        label: normalizedValueOptions.displayLabel,
        sortOrder: normalizedValueOptions.sortOrder,
      })
      .from(normalizedValueOptions)
      .where(
        and(
          eq(normalizedValueOptions.category, "material_fasady"),
          eq(normalizedValueOptions.isActive, true),
        ),
      )
      .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

    const materialyInterieru = await db
      .select({
        value: normalizedValueOptions.value,
        label: normalizedValueOptions.displayLabel,
        sortOrder: normalizedValueOptions.sortOrder,
      })
      .from(normalizedValueOptions)
      .where(
        and(
          eq(normalizedValueOptions.category, "material_interieru"),
          eq(normalizedValueOptions.isActive, true),
        ),
      )
      .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

    const stavy = await db
      .select({
        value: normalizedValueOptions.value,
        label: normalizedValueOptions.displayLabel,
        sortOrder: normalizedValueOptions.sortOrder,
      })
      .from(normalizedValueOptions)
      .where(
        and(
          eq(normalizedValueOptions.category, "aktualny_stav"),
          eq(normalizedValueOptions.isActive, true),
        ),
      )
      .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

    const obdobia = await db
      .select({
        value: normalizedValueOptions.value,
        label: normalizedValueOptions.displayLabel,
        sortOrder: normalizedValueOptions.sortOrder,
      })
      .from(normalizedValueOptions)
      .where(
        and(
          eq(normalizedValueOptions.category, "obdobie"),
          eq(normalizedValueOptions.isActive, true),
        ),
      )
      .orderBy(normalizedValueOptions.sortOrder, normalizedValueOptions.value);

    res.json({
      typyStrechy: typyStrechy.map((r) => ({
        value: r.value,
        label: r.label || r.value,
      })),
      materialyFasady: materialyFasady.map((r) => ({
        value: r.value,
        label: r.label || r.value,
      })),
      materialyInterieru: materialyInterieru.map((r) => ({
        value: r.value,
        label: r.label || r.value,
      })),
      stavy: stavy.map((r) => ({
        value: r.value,
        label: r.label || r.value,
      })),
      obdobia: obdobia.map((r) => ({
        value: r.value,
        label: r.label || r.value,
      })),
    });
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

    const { generateQueryEmbedding } =
      await import("../services/embeddingService");
    const queryEmbedding = await generateQueryEmbedding(query);
    const embeddingStr = `[${queryEmbedding.join(",")}]`;
    const wordPattern = `\\m${query}`;

    const { rows: results } = await pool.query(
      `
      WITH category_scores AS (
        SELECT 
          be.budova_id,
          LEAST(
            COALESCE(be.meno_budovy_emb <=> $1::vector, 1),
            COALESCE(be.adresa_emb <=> $1::vector, 1),
            COALESCE(be.rok_vystavby_emb <=> $1::vector, 1),
            COALESCE(be.aktualny_vlastnik_emb <=> $1::vector, 1),
            COALESCE(be.rok_zaradenia_emb <=> $1::vector, 1),
            COALESCE(be.historicky_vyznam_emb <=> $1::vector, 1),
            COALESCE(be.zaznamy_o_obnove_emb <=> $1::vector, 1),
            COALESCE(be.material_vonkajsej_fasady_emb <=> $1::vector, 1),
            COALESCE(be.typ_strechy_emb <=> $1::vector, 1),
            COALESCE(be.material_interieru_emb <=> $1::vector, 1),
            COALESCE(be.ine_materialy_emb <=> $1::vector, 1),
            COALESCE(be.aktualny_stav_emb <=> $1::vector, 1),
            COALESCE(be.kriticke_miesta_emb <=> $1::vector, 1),
            COALESCE(be.potrebne_sanacie_emb <=> $1::vector, 1),
            COALESCE(be.sucasne_fotografie_emb <=> $1::vector, 1),
            COALESCE(be.historicke_fotografie_emb <=> $1::vector, 1),
            COALESCE(be.plany_a_schemy_emb <=> $1::vector, 1),
            COALESCE(be.harmonogram_udrzby_emb <=> $1::vector, 1),
            COALESCE(be.revizne_zaznamy_emb <=> $1::vector, 1),
            COALESCE(be.ochranne_zony_emb <=> $1::vector, 1),
            COALESCE(be.povolenia_na_zasahy_emb <=> $1::vector, 1),
            COALESCE(be.legislativne_obmedzenia_emb <=> $1::vector, 1),
            COALESCE(be.digitalne_vykresy_emb <=> $1::vector, 1),
            COALESCE(be.archeologicke_vyskumy_emb <=> $1::vector, 1),
            COALESCE(be.chemicke_analyzy_emb <=> $1::vector, 1)
          ) as min_distance
        FROM buildings_info_embed be
      ),
      text_matches AS (
        SELECT id as budova_id
        FROM buildings_info
        WHERE is_hidden = false
          AND (
            meno_budovy ~* $2
            OR adresa ~* $2
          )
      )
      SELECT 
        bi.*,
        COALESCE(cs.min_distance, 0.99) as similarity_score
      FROM buildings_info bi
      LEFT JOIN category_scores cs ON bi.id = cs.budova_id
      LEFT JOIN text_matches tm ON bi.id = tm.budova_id
      WHERE bi.is_hidden = false
        AND (cs.min_distance < 0.5 OR tm.budova_id IS NOT NULL)
      ORDER BY 
        CASE WHEN tm.budova_id IS NOT NULL AND (cs.min_distance IS NULL OR cs.min_distance >= 0.5) THEN 0
            WHEN tm.budova_id IS NOT NULL THEN cs.min_distance - 0.1
            ELSE cs.min_distance
        END ASC
      LIMIT 50
    `,
      [embeddingStr, wordPattern],
    );

    const transformedResults = results.map((row: any) => ({
      id: row.id,
      sourceDocumentId: row.source_document_id,
      menoBudovy: row.meno_budovy,
      adresa: row.adresa,
      gpsSuradnice: row.gps_suradnice,
      rokVystavby: row.rok_vystavby,
      aktualnyVlastnik: row.aktualny_vlastnik,
      rokZaradenia: row.rok_zaradenia,
      historickyVyznam: row.historicky_vyznam,
      zaznamyOObnove: row.zaznamy_o_obnove,
      materialVonkajsejFasady: row.material_vonkajsej_fasady,
      typStrechy: row.typ_strechy,
      materialInterieru: row.material_interieru,
      ineMaterialy: row.ine_materialy,
      aktualnyStav: row.aktualny_stav,
      kritickeMiesta: row.kriticke_miesta,
      potrebneSanacie: row.potrebne_sanacie,
      sucasneFotografie: row.sucasne_fotografie,
      historickeFotografie: row.historicke_fotografie,
      planyASchemy: row.plany_a_schemy,
      harmonogramUdrzby: row.harmonogram_udrzby,
      revizneZaznamy: row.revizne_zaznamy,
      ochranneZony: row.ochranne_zony,
      povoleniaNaZasahy: row.povolenia_na_zasahy,
      legislativneObmedzenia: row.legislativne_obmedzenia,
      digitalneVykresy: row.digitalne_vykresy,
      archeologickeVyskumy: row.archeologicke_vyskumy,
      chemickeAnalyzy: row.chemicke_analyzy,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(transformedResults);
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
