import { pool } from "../db";
import { snakeToCamel } from "../utils/caseConverter";
import { generateQueryEmbedding } from "./embeddingService";

/**
 * Embedding stĺpce v `buildings_info_embed`, ktoré sa používajú pri
 * sémantickom vyhľadávaní. Pridanie/odobratie kategórie = jeden riadok.
 */
const SEARCHABLE_EMBEDDING_COLUMNS = [
  "meno_budovy_emb",
  "adresa_emb",
  "rok_vystavby_emb",
  "aktualny_vlastnik_emb",
  "rok_zaradenia_emb",
  "historicky_vyznam_emb",
  "zaznamy_o_obnove_emb",
  "material_vonkajsej_fasady_emb",
  "typ_strechy_emb",
  "material_interieru_emb",
  "ine_materialy_emb",
  "aktualny_stav_emb",
  "kriticke_miesta_emb",
  "potrebne_sanacie_emb",
  "sucasne_fotografie_emb",
  "historicke_fotografie_emb",
  "plany_a_schemy_emb",
  "harmonogram_udrzby_emb",
  "revizne_zaznamy_emb",
  "ochranne_zony_emb",
  "povolenia_na_zasahy_emb",
  "legislativne_obmedzenia_emb",
  "digitalne_vykresy_emb",
  "archeologicke_vyskumy_emb",
  "chemicke_analyzy_emb",
] as const;

const SIMILARITY_THRESHOLD = 0.5;
const RESULT_LIMIT = 50;

// Polia, ktoré sa do API odpovede nemajú dostať.
const OMIT_KEYS = new Set(["is_hidden", "similarity_score"]);

function rowToCamelCase(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (OMIT_KEYS.has(key)) continue;
    out[snakeToCamel(key)] = value;
  }
  return out;
}

function escapePosixRegex(input: string): string {
  return input.replace(/[\\^$.|?*+()\[\]{}]/g, "\\$&");
}

export async function searchBuildings(
  query: string,
): Promise<Record<string, unknown>[]> {
  const queryEmbedding = await generateQueryEmbedding(query);
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const wordPattern = `\\m${escapePosixRegex(query)}`;

  const leastClause = SEARCHABLE_EMBEDDING_COLUMNS.map(
    (col) => `COALESCE(be.${col} <=> $1::vector, 1)`,
  ).join(",\n        ");

  const sql = `
    WITH category_scores AS (
      SELECT
        be.budova_id,
        LEAST(
          ${leastClause}
        ) AS min_distance
      FROM buildings_info_embed be
    ),
    text_matches AS (
      SELECT id AS budova_id
      FROM buildings_info
      WHERE is_hidden = false
        AND (meno_budovy ~* $2 OR adresa ~* $2)
    )
    SELECT
      bi.*,
      COALESCE(cs.min_distance, 0.99) AS similarity_score
    FROM buildings_info bi
    LEFT JOIN category_scores cs ON bi.id = cs.budova_id
    LEFT JOIN text_matches tm ON bi.id = tm.budova_id
    WHERE bi.is_hidden = false
      AND (cs.min_distance < $3 OR tm.budova_id IS NOT NULL)
    ORDER BY
      CASE
        WHEN tm.budova_id IS NOT NULL
             AND (cs.min_distance IS NULL OR cs.min_distance >= $3) THEN 0
        WHEN tm.budova_id IS NOT NULL THEN cs.min_distance - 0.1
        ELSE cs.min_distance
      END ASC
    LIMIT $4
  `;

  const { rows } = await pool.query(sql, [
    embeddingStr,
    wordPattern,
    SIMILARITY_THRESHOLD,
    RESULT_LIMIT,
  ]);

  return rows.map(rowToCamelCase);
}
