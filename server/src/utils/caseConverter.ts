/**
 * Utility functions for converting between snake_case and camelCase
 * Used to ensure consistent API responses (always camelCase for frontend)
 */

/**
 * Convert snake_case string to camelCase
 * Example: "meno_budovy" -> "menoBudovy"
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 * Example: "menoBudovy" -> "meno_budovy"
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Field name labels mapping (snake_case -> Slovak display name)
 * Single source of truth for field display names
 */
export const FIELD_LABELS: Record<string, string> = {
  meno_budovy: "Meno budovy",
  adresa: "Adresa",
  gps_suradnice: "GPS súradnice",
  rok_vystavby: "Rok výstavby",
  aktualny_vlastnik: "Aktuálny vlastník",
  rok_zaradenia: "Rok zaradenia",
  historicky_vyznam: "Historický význam",
  zaznamy_o_obnove: "Záznamy o obnove",
  material_vonkajsej_fasady: "Materiál vonkajšej fasády",
  typ_strechy: "Typ strechy",
  material_interieru: "Materiál interiéru",
  ine_materialy: "Iné materiály",
  aktualny_stav: "Aktuálny stav",
  kriticke_miesta: "Kritické miesta",
  potrebne_sanacie: "Potrebné sanácie",
  sucasne_fotografie: "Súčasné fotografie",
  historicke_fotografie: "Historické fotografie",
  plany_a_schemy: "Plány a schémy",
  harmonogram_udrzby: "Harmonogram údržby",
  revizne_zaznamy: "Revízne záznamy",
  ochranne_zony: "Ochranné zóny",
  povolenia_na_zasahy: "Povolenia na zásahy",
  legislativne_obmedzenia: "Legislatívne obmedzenia",
  digitalne_vykresy: "Digitálne výkresy",
  archeologicke_vyskumy: "Archeologické výskumy",
  chemicke_analyzy: "Chemické analýzy",
};

/**
 * Get field label by field name (supports both snake_case and camelCase input)
 */
export function getFieldLabel(fieldName: string): string {
  // Try snake_case first
  if (FIELD_LABELS[fieldName]) {
    return FIELD_LABELS[fieldName];
  }
  // Convert to snake_case and try again
  const snakeKey = camelToSnake(fieldName);
  return FIELD_LABELS[snakeKey] || fieldName;
}
