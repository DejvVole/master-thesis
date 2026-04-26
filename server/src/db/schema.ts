import {
  customType,
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  unique,
  boolean,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const vector = customType<{ data: number[] }>({
  dataType() {
    return "vector(1536)";
  },
});

export const sourceDocuments = pgTable("source_documents", {
  id: serial("id").primaryKey(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileHash: varchar("file_hash", { length: 64 }).unique(),
  filePath: varchar("file_path", { length: 500 }),
  metadata: jsonb("metadata"),
  processedDate: timestamp("processed_date"),
  createdAt: timestamp("created_at").defaultNow(),
  isHidden: boolean("is_hidden").default(false),
});

export const documentProcessing = pgTable(
  "document_processing",
  {
    id: serial("id").primaryKey(),
    sourceDocumentId: integer("source_document_id")
      .notNull()
      .references(() => sourceDocuments.id, { onDelete: "cascade" }),
    minioObjectName: varchar("minio_object_name", { length: 500 }).notNull(),
    minioBucket: varchar("minio_bucket", { length: 100 })
      .notNull()
      .default("raw-pdfs"),
    chromaCollectionName: varchar("chroma_collection_name", {
      length: 100,
    }).notNull(),
    chunksCount: integer("chunks_count").default(0),
    processingStartedAt: timestamp("processing_started_at"),
    processingCompletedAt: timestamp("processing_completed_at"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    uniqueSourceMinio: unique().on(
      table.sourceDocumentId,
      table.minioObjectName,
    ),
  }),
);

export const buildings_info = pgTable("buildings_info", {
  id: serial("id").primaryKey(),
  sourceDocumentId: integer("source_document_id").references(
    () => sourceDocuments.id,
  ),
  menoBudovy: text("meno_budovy"),
  adresa: text("adresa"),
  gpsSuradnice: text("gps_suradnice"),
  rokVystavby: text("rok_vystavby"),
  rokVystavbyNormalized: integer("rok_vystavby_normalized"),
  aktualnyVlastnik: text("aktualny_vlastnik"),
  rokZaradenia: text("rok_zaradenia"),
  historickyVyznam: text("historicky_vyznam"),
  zaznamyOObnove: text("zaznamy_o_obnove"),
  materialVonkajsejFasady: text("material_vonkajsej_fasady"),
  typStrechy: text("typ_strechy"),
  materialInterieru: text("material_interieru"),
  ineMaterialy: text("ine_materialy"),
  aktualnyStav: text("aktualny_stav"),
  kritickeMiesta: text("kriticke_miesta"),
  potrebneSanacie: text("potrebne_sanacie"),
  sucasneFotografie: text("sucasne_fotografie"),
  historickeFotografie: text("historicke_fotografie"),
  planyASchemy: text("plany_a_schemy"),
  harmonogramUdrzby: text("harmonogram_udrzby"),
  revizneZaznamy: text("revizne_zaznamy"),
  ochranneZony: text("ochranne_zony"),
  povoleniaNaZasahy: text("povolenia_na_zasahy"),
  legislativneObmedzenia: text("legislativne_obmedzenia"),
  digitalneVykresy: text("digitalne_vykresy"),
  archeologickeVyskumy: text("archeologicke_vyskumy"),
  chemickeAnalyzy: text("chemicke_analyzy"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  isHidden: boolean("is_hidden").default(false),
});

export const buildingsInfoEmbed = pgTable(
  "buildings_info_embed",
  {
    id: serial("id").primaryKey(),
    budovaId: integer("budova_id")
      .notNull()
      .references(() => buildings_info.id, { onDelete: "cascade" }),

    // Základné informácie
    menoBudovyEmb: vector("meno_budovy_emb"),
    adresaEmb: vector("adresa_emb"),
    gpsSuradniceEmb: vector("gps_suradnice_emb"),
    rokVystavbyEmb: vector("rok_vystavby_emb"),
    aktualnyVlastnikEmb: vector("aktualny_vlastnik_emb"),

    // Historické údaje
    rokZaradeniaEmb: vector("rok_zaradenia_emb"),
    historickyVyznamEmb: vector("historicky_vyznam_emb"),
    zaznamyOObnoveEmb: vector("zaznamy_o_obnove_emb"),

    // Materiály
    materialVonkajsejFasadyEmb: vector("material_vonkajsej_fasady_emb"),
    typStrechyEmb: vector("typ_strechy_emb"),
    materialInterieruEmb: vector("material_interieru_emb"),
    ineMaterialyEmb: vector("ine_materialy_emb"),

    // Stav
    aktualnyStavEmb: vector("aktualny_stav_emb"),
    kritickeMiestaEmb: vector("kriticke_miesta_emb"),
    potrebneSanacieEmb: vector("potrebne_sanacie_emb"),

    // Dokumentácia
    sucasneFotografieEmb: vector("sucasne_fotografie_emb"),
    historickeFotografieEmb: vector("historicke_fotografie_emb"),
    planyAShemyEmb: vector("plany_a_schemy_emb"),

    // Údržba
    harmonogramUdrzbyEmb: vector("harmonogram_udrzby_emb"),
    revizneZaznamyEmb: vector("revizne_zaznamy_emb"),
    ochranneZonyEmb: vector("ochranne_zony_emb"),

    // Legislatíva
    povoleniaNaZasahyEmb: vector("povolenia_na_zasahy_emb"),
    legislativneObmedzeniaEmb: vector("legislativne_obmedzenia_emb"),

    // Digitálne
    digitalneVykresyEmb: vector("digitalne_vykresy_emb"),

    // Výskum
    archeologickeVyskumyEmb: vector("archeologicke_vyskumy_emb"),
    chemickeAnalyzyEmb: vector("chemicke_analyzy_emb"),

    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueBudova: unique().on(table.budovaId),
  }),
);

// Číselník normalizovaných hodnôt
export const normalizedValueOptions = pgTable("normalized_value_options", {
  id: serial("id").primaryKey(),
  category: text("category").notNull(),
  value: text("value").notNull(),
  displayLabel: text("display_label"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// M:N prepojenie budov a normalizovaných hodnôt
export const buildingsNormalizedValues = pgTable(
  "buildings_normalized_values",
  {
    id: serial("id").primaryKey(),
    buildingId: integer("building_id")
      .notNull()
      .references(() => buildings_info.id, { onDelete: "cascade" }),
    normalizedOptionId: integer("normalized_option_id")
      .notNull()
      .references(() => normalizedValueOptions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
);

// Tabuľka pre source metadata
export const buildingsInfoSources = pgTable("buildings_info_sources", {
  id: serial("id").primaryKey(),
  budovaId: integer("budova_id")
    .notNull()
    .references(() => buildings_info.id, { onDelete: "cascade" }),
  fieldName: text("field_name").notNull(),
  sourceType: text("source_type").notNull(),
  confidence: text("confidence"),
  reasoning: text("reasoning"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const buildingsInfoRelations = relations(
  buildings_info,
  ({ many, one }) => ({
    normalizedValues: many(buildingsNormalizedValues),
    sources: many(buildingsInfoSources),
    sourceDocument: one(sourceDocuments, {
      fields: [buildings_info.sourceDocumentId],
      references: [sourceDocuments.id],
    }),
  }),
);

export const normalizedValueOptionsRelations = relations(
  normalizedValueOptions,
  ({ many }) => ({
    buildingValues: many(buildingsNormalizedValues),
  }),
);

export const buildingsNormalizedValuesRelations = relations(
  buildingsNormalizedValues,
  ({ one }) => ({
    building: one(buildings_info, {
      fields: [buildingsNormalizedValues.buildingId],
      references: [buildings_info.id],
    }),
    normalizedOption: one(normalizedValueOptions, {
      fields: [buildingsNormalizedValues.normalizedOptionId],
      references: [normalizedValueOptions.id],
    }),
  }),
);

export const buildingsInfoSourcesRelations = relations(
  buildingsInfoSources,
  ({ one }) => ({
    building: one(buildings_info, {
      fields: [buildingsInfoSources.budovaId],
      references: [buildings_info.id],
    }),
  }),
);
