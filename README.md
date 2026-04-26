# Building RAG — Systém na extrakciu informácií o historických budovách

Webová aplikácia využívajúca **Retrieval-Augmented Generation (RAG)** na automatickú extrakciu štruktúrovaných informácií z dokumentov o historických budovách. Používateľ nahrá dokument (PDF/DOC/DOCX), systém ho spracuje pomocou LLM a výsledky uloží do databázy. Extrahované budovy je následne možné prehľadávať, filtrovať a exportovať.

---

## Obsah

- [Prehľad projektu](#prehľad-projektu)
- [Architektúra](#architektúra)
- [Technológie](#technológie)
- [Štruktúra projektu](#štruktúra-projektu)
- [Predpoklady](#predpoklady)
- [Inštalácia a spustenie](#inštalácia-a-spustenie)
  - [1. Priprav .env súbory](#1-priprav-env-súbory)
  - [2. Spusti celý stack jedným príkazom](#2-spusti-celý-stack-jedným-príkazom)
  - [3. Overenie dostupnosti](#3-overenie-dostupnosti)
  - [4. Vytvorenie admin účtu](#4-vytvorenie-admin-účtu)
  - [5. Bežné príkazy](#5-bežné-príkazy)
- [Premenné prostredia](#premenné-prostredia)
- [RAG Pipeline — ako to funguje](#rag-pipeline--ako-to-funguje)
- [Databázová schéma](#databázová-schéma)
- [API endpointy](#api-endpointy)
- [Kategórie budov](#kategórie-budov)
- [Autentifikácia a autorizácia](#autentifikácia-a-autorizácia)

---

## Prehľad projektu

Hlavnou úlohou projektu je vytvoriť RAG systém, ktorý automaticky získava informácie o historických budovách z neštruktúrovaných dokumentov (PDF/DOC/DOCX). Systém extrahuje dáta do **26 preddefinovaných kategórií** (názov budovy, adresa, rok výstavby, typ strechy, materiály, stav budovy, atď.) a ukladá ich do PostgreSQL databázy.

**Hlavné funkcionality:**

- **Upload dokumentu** — Používateľ nahrá PDF/DOC/DOCX dokument o budove cez webové rozhranie
- **RAG extrakcia** — Systém rozdelí dokument na chunky, vytvorí embeddingy, a pre každú kategóriu pomocou LLM extrahuje odpoveď
- **AI inference** — Voliteľne dokáže LLM odhadnúť chýbajúce kategórie na základe už extrahovaných informácií
- **Normalizácia** — Surové textové hodnoty sa normalizujú do preddefinovaných možností (napr. typ strechy → SEDLOVÁ, VALBOVÁ, ...)
- **Filtrovanie budov** — Používateľ si môže budovy filtrovať podľa rôznych atribútov (rok výstavby, materiál, stav, ...)
- **Sémantické vyhľadávanie** — Vyhľadávanie budov pomocou vektorovej podobnosti (pgvector embeddingy)
- **Export dát** — Export údajov o budove do CSV alebo PDF
- **Zobrazenie zdrojového dokumentu** — Ku každej budove je dostupný originálny dokument (cez presigned URL)
- **Admin panel** — Správa dokumentov, používateľov a pozvánok

---

## Architektúra

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                           │
│            Vite + React 19 + Chakra UI + React Router           │
│    Filtrovanie, vyhľadávanie, detail budovy, admin panel        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP (REST API)
┌────────────────────────────▼────────────────────────────────────┐
│                     SERVER (Node.js/Express)                    │
│          TypeScript + Drizzle ORM + better-auth                 │
│   Auth, CRUD, upload, filtrovanie, sémantické vyhľadávanie      │
│                             │                                   │
│          ┌──────────────────┼──────────────────┐                │
│          │ spawn()          │ Drizzle ORM      │ MinIO SDK      │
│          ▼                  ▼                  ▼                │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐          │
│   │   BACKEND   │   │ PostgreSQL  │   │    MinIO    │          │
│   │ Python RAG  │   │ + pgvector  │   │  (S3-like)  │          │
│   └─────────────┘   └─────────────┘   └─────────────┘          │
└─────────────────────────────────────────────────────────────────┘

BACKEND (Python) — Spúšťa sa ako child process zo servera
│
├── LlamaIndex (chunking, embeddingy, query engine)
├── OpenAI / Groq / Mistral (LLM)
├── ChromaDB (vektorový store pre RAG)
├── RAGAS (evaluácia kvality RAG)
└── psycopg2 (ukladanie do PostgreSQL)
```

---

## Technológie

### Backend (Python RAG Pipeline)

| Technológia            | Účel                                                          |
| ---------------------- | ------------------------------------------------------------- |
| **LlamaIndex**         | RAG framework — chunking, embeddingy, query engine, reranking |
| **OpenAI GPT-4o-mini** | Hlavný LLM pre extrakciu a inference                          |
| **Groq (Llama 3.1)**   | Alternatívny LLM                                              |
| **Mistral AI**         | Alternatívny LLM                                              |
| **ChromaDB**           | Lokálny vektorový store pre chunks dokumentov                 |
| **RAGAS**              | Evaluácia kvality RAG (faithfulness, relevancy, ...)          |
| **psycopg2**           | Pripojenie k PostgreSQL databáze                              |
| **MinIO Python SDK**   | Práca s object storage (upload/download dokumentov)           |

### Server (Node.js API)

| Technológia     | Účel                                                |
| --------------- | --------------------------------------------------- |
| **Express 5**   | HTTP server a REST API                              |
| **TypeScript**  | Typová bezpečnosť                                   |
| **Drizzle ORM** | ORM pre PostgreSQL                                  |
| **better-auth** | Autentifikácia (email/heslo, magic link, roles)     |
| **MinIO SDK**   | Generovanie presigned URL pre zdrojový dokument     |
| **OpenAI SDK**  | Generovanie embeddingov pre sémantické vyhľadávanie |
| **Multer**      | Upload súborov                                      |
| **Nodemailer**  | Odosielanie email pozvánok                          |
| **Zod**         | Validácia vstupov                                   |

### Client (React Frontend)

| Technológia           | Účel                     |
| --------------------- | ------------------------ |
| **React 19**          | UI framework             |
| **Vite 7**            | Build tool a dev server  |
| **TypeScript**        | Typová bezpečnosť        |
| **Chakra UI v3**      | Komponentová knižnica    |
| **React Router v7**   | Routing                  |
| **Axios**             | HTTP requesty            |
| **jsPDF**             | Generovanie PDF exportov |
| **better-auth/react** | Auth integrácia (hooks)  |

### Infraštruktúra (Docker)

| Služba                       | Účel                                                  |
| ---------------------------- | ----------------------------------------------------- |
| **PostgreSQL 15 + pgvector** | Relačná databáza s vektorovým rozšírením              |
| **PgAdmin 4**                | Webový administrátor databázy                         |
| **MinIO**                    | S3-kompatibilný object storage pre zdrojové dokumenty |

---

## Predpoklady

- **Docker** + **Docker Compose v2**
- **OpenAI API kľúč** (povinný)
- Voliteľne: Groq/Mistral API kľúč, SMTP údaje pre pozvánky emailom

---

## Inštalácia a spustenie

### 1. Priprav `.env` súbory

```bash
# V koreňovom priečinku projektu
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
cp backend/.env.example backend/.env
```

Následne uprav minimálne:

- `server/.env` -> `OPENAI_API_KEY`
- `server/.env` -> `BETTER_AUTH_SECRET` (napr. `openssl rand -base64 32`)

Poznámka:

- Pri behu v Dockeri má `server/.env` defaultne `DB_HOST=postgres` a `MINIO_ENDPOINT=minio`.
- `backend/.env` je pripravený pre prípad manuálneho spúšťania Python skriptov mimo Dockeru.

### 2. Spusti celý stack jedným príkazom

```bash
docker compose up --build
```

Týmto sa spustí:

- `postgres` (PostgreSQL + pgvector)
- `minio` + MinIO Console
- `pgadmin`
- `server` (Node API)
- `client` (Vite frontend)

Dôležité:

- Python balíčky z `backend/requirements.txt` sa inštalujú automaticky počas build-u `server` image.
- SQL init (`backend/src/db/init.sql`) sa vykoná automaticky pri prvom štarte databázy a vytvorí RAG aj auth tabuľky.
- Skript sa vykoná len pri prvotnej inicializácii PostgreSQL volume (pri už existujúcom volume sa znovu nespúšťa).

### 3. Overenie dostupnosti

- Frontend: `http://localhost:5173`
- API healthcheck: `http://localhost:3001/api/health`
- PgAdmin: `http://localhost:5050`
- MinIO Console: `http://localhost:9001`

### 4. Vytvorenie admin účtu

Po štarte kontajnerov spusti:

```bash
docker compose exec server npx tsx src/scripts/create-admin.ts
```

### 5. Bežné príkazy

```bash
# Stop stack
docker compose down

# Stop stack + zmazanie databázového a MinIO volume
docker compose down -v
```

---

## Premenné prostredia

Použi pripravené šablóny:

```bash
cp .env.example .env
cp server/.env.example server/.env
cp client/.env.example client/.env
cp backend/.env.example backend/.env
```

### Koreňový `.env` (pre docker-compose)

```env
# PostgreSQL
DB_NAME=building_rag
DB_USER=postgres
DB_PASSWORD=rag_password

# PgAdmin
PGADMIN_EMAIL=admin@admin.com
PGADMIN_PASSWORD=admin

# MinIO
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Server `.env` (`server/.env`)

```env
# Server
HOST=0.0.0.0
PORT=3001
NODE_ENV=development

# Databáza (docker network)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=building_rag
DB_USER=postgres
DB_PASSWORD=rag_password
DATABASE_URL=postgres://postgres:rag_password@postgres:5432/building_rag

# MinIO (docker network)
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_RAW=raw-pdfs
MINIO_BUCKET_EXPORTS=rag-exports

# Frontend URL + CORS
CLIENT_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Voliteľné LLM
GROQ_API_KEY=your_groq_api_key_optional
MISTRAL_API_KEY=your_mistral_api_key_optional

# Auth (32+ znakov)
BETTER_AUTH_SECRET=replace_with_random_secret

# Email (SMTP) — pre pozvánky
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
APP_NAME=Historic Buildings

# Python backend in server container
PYTHON_BIN=/opt/venv/bin/python
BACKEND_DIR=/app/backend
```

### Client `.env` (`client/.env`)

```env
VITE_API_URL=http://localhost:3001
```

### Backend `.env` (`backend/.env`) - voliteľné mimo Dockeru

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=building_rag
DB_USER=postgres
DB_PASSWORD=rag_password

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false

MINIO_BUCKET_RAW=raw-pdfs
MINIO_BUCKET_EXPORTS=rag-exports

OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key_optional
MISTRAL_API_KEY=your_mistral_api_key_optional
```

---

## RAG Pipeline — ako to funguje

Keď používateľ nahrá dokument (PDF/DOC/DOCX), spustí sa nasledovný proces:

### Krok 1: Upload a príprava

1. **Súbor sa nahrá** cez Express API (multer) na server
2. **SHA-256 hash** súboru sa vypočíta pre detekciu duplikátov
3. **Dokument sa uloží** do MinIO object storage (bucket `raw-pdfs`)
4. Server **spustí Python RAG pipeline** ako child process (`spawn`)
5. **Progress** sa hlási cez SSE (Server-Sent Events) na frontend

### Krok 2: RAG Extrakcia (Python)

1. **Načítanie dokumentu** — podľa typu súboru sa použije `PDFReader` alebo `DocxReader` (pri `.doc` prebieha fallback konverzia/parsing)
2. **Chunking** — Dokument sa rozdelí na menšie časti (chunks) pomocou `SentenceSplitter` (256 tokenov, 64 overlap)
3. **Metadata extrakcia** — Pre každý chunk sa extrahuje názov a vygenerujú sa QA páry (`TitleExtractor`, `QuestionsAnsweredExtractor`)
4. **Embeddingy** — Chunky sa embedujú pomocou `text-embedding-3-small` a uložia do ChromaDB
5. **Pre každú z 26 kategórií:**
   - Retriever nájde top-15 najrelevantnejších chunkov
   - `LLMRerank` zoradí a vyberie top-6
   - LLM (GPT-4o-mini) odpovie na otázku v slovenčine
   - Ak informácia nie je v dokumente, odpovie „NIE JE"

### Krok 3: AI Inference (voliteľný)

- Pre kategórie kde RAG odpovedal „NIE JE", sa LLM pokúsi **odhadnúť** hodnotu na základe ostatných extrahovaných informácií
- Každý odhad obsahuje **úroveň dôveryhodnosti** (LOW / MEDIUM / HIGH) a **zdôvodnenie**
- Výsledky sa označia ako EXTRACTED, INFERRED alebo MISSING

### Krok 4: Normalizácia

- Surové textové hodnoty pre vybrané kategórie (typ strechy, materiál fasády, materiál interiéru, stav, obdobie) sa **normalizujú** na preddefinované hodnoty z databázy
- LLM mapuje voľný text na štandardizované možnosti (napr. „šindľová sedlová strecha" → `SEDLOVÁ`)
- Podporuje multiselect (budova môže mať viacero materiálov)

### Krok 5: Uloženie

- Výsledky sa uložia do PostgreSQL (`buildings_info`, `buildings_info_sources`, `buildings_normalized_values`)
- Pre každú kategóriu sa uložia aj **embeddingy** do `buildings_info_embed` (vektor 1536 dimenzií)
- Zdrojové metadáta (EXTRACTED/INFERRED/MISSING + confidence) sa uložia do `buildings_info_sources`
- Pri manuálnej editácii v admin paneli sa `source_type` nastaví na `EDITED`

---

## API endpointy

### Verejné

| Metóda | Endpoint                        | Popis             |
| ------ | ------------------------------- | ----------------- |
| `POST` | `/api/auth/sign-in/email`       | Prihlásenie       |
| `GET`  | `/api/invitation/verify/:token` | Overenie pozvánky |
| `POST` | `/api/invitation/accept`        | Prijatie pozvánky |
| `GET`  | `/api/health`                   | Health check      |

### Authenticated (vyžadujú prihlásenie)

| Metóda | Endpoint                        | Popis                              |
| ------ | ------------------------------- | ---------------------------------- |
| `GET`  | `/api/buildings`                | Zoznam všetkých budov              |
| `GET`  | `/api/buildings/:id`            | Detail budovy                      |
| `GET`  | `/api/buildings/:id/document`   | Metadata zdrojového dokumentu      |
| `GET`  | `/api/buildings/:id/pdf-url`    | Presigned URL na zdrojový dokument |
| `GET`  | `/api/buildings/:id/sources`    | Zdrojové metadata pre polia budovy |
| `GET`  | `/api/buildings/filter`         | Filtrovanie podľa atribútov        |
| `GET`  | `/api/buildings/filter-options` | Dostupné hodnoty pre filtre        |
| `POST` | `/api/buildings/search`         | Sémantické vyhľadávanie            |

### Admin (vyžadujú admin rolu)

| Metóda   | Endpoint                                             | Popis                                      |
| -------- | ---------------------------------------------------- | ------------------------------------------ |
| `POST`   | `/api/buildings/upload`                              | Upload dokumentu (PDF/DOC/DOCX)            |
| `GET`    | `/api/buildings/upload/progress/:sessionId`          | SSE stream progressu spracovania           |
| `DELETE` | `/api/buildings/upload/:sessionId`                   | Zrušenie prebiehajúceho spracovania        |
| `GET`    | `/api/admin/documents`                               | Zoznam všetkých dokumentov                 |
| `PATCH`  | `/api/admin/documents/:id/toggle-visibility`         | Skrytie/zobrazenie dokumentu               |
| `DELETE` | `/api/admin/documents/:id`                           | Zmazanie dokumentu a súvisiacich dát       |
| `GET`    | `/api/admin/stats`                                   | Agregované štatistiky pre admin dashboard  |
| `GET`    | `/api/admin/buildings/:id/sources`                   | Zdrojové metadata kategórií budovy         |
| `PATCH`  | `/api/admin/buildings/:buildingId/sources/:sourceId` | Manuálna úprava hodnoty + označenie EDITED |
| `POST`   | `/api/invitation`                                    | Odoslanie pozvánky                         |
| `GET`    | `/api/invitation/list`                               | Zoznam pozvánok                            |
| `DELETE` | `/api/invitation/:id`                                | Zmazanie pozvánky                          |

---

## Kategórie budov

RAG pipeline extrahuje nasledujúcich **26 kategórií** z každého dokumentu:

| #   | Kategória                 | Popis                             |
| --- | ------------------------- | --------------------------------- |
| 1   | Meno budovy               | Názov a typ budovy                |
| 2   | Adresa                    | Ulica, mesto, okres               |
| 3   | GPS súradnice             | Zemepisná šírka a dĺžka           |
| 4   | Rok výstavby              | Rok dokončenia / vzniku           |
| 5   | Aktuálny vlastník         | Majiteľ budovy                    |
| 6   | Rok zaradenia             | Rok evidencie                     |
| 7   | Historický význam         | Kultúrna a historická hodnota     |
| 8   | Záznamy o obnove          | Rekonštrukcie, prestavby          |
| 9   | Materiál vonkajšej fasády | Obvodové steny, fasáda            |
| 10  | Typ strechy               | Sedlová, valbová, plochá, ...     |
| 11  | Materiál interiéru        | Drevo, omietka, kameň, ...        |
| 12  | Iné materiály             | Doplnkové materiály               |
| 13  | Aktuálny stav             | Výborný / Dobrý / Havarijný / ... |
| 14  | Kritické miesta           | Ohrozené časti budovy             |
| 15  | Potrebné sanácie          | Nutné opravy                      |
| 16  | Súčasné fotografie        | Aktuálne snímky                   |
| 17  | Historické fotografie     | Staré fotografie                  |
| 18  | Plány a schémy            | Architektonické plány             |
| 19  | Harmonogram údržby        | Plán údržby                       |
| 20  | Revízne záznamy           | Záznamy z revízií                 |
| 21  | Ochranné zóny             | Ochranné pásma                    |
| 22  | Povolenia na zásahy       | Stavebné povolenia                |
| 23  | Legislatívne obmedzenia   | Právne obmedzenia                 |
| 24  | Digitálne výkresy         | CAD výkresy                       |
| 25  | Archeologické výskumy     | Výskumné správy                   |
| 26  | Chemické analýzy          | Laboratórne analýzy               |

Kategórie sú definované v `backend/data/categories/categories.json` vrátane popisov a synoným pre lepšiu extrakciu.

---

## Autentifikácia a autorizácia

Systém používa **better-auth** s nasledujúcimi funkciami:

- **Email + heslo** — štandardné prihlásenie
- **Magic link pozvánky** — admin pošle pozvánku na email, používateľ klikne na odkaz a dokončí registráciu
- **Role** — `user` (prehliadanie budov) a `admin` (správa dokumentov, používateľov)
- **Session** — cookie-based session s 7-dňovou platnosťou
- **Rate limiting** — ochrana pred brute force útokmi
- **Ban systém** — admin môže zablokovať používateľov

---

## Filtrovanie budov

Používateľ môže filtrovať budovy podľa:

| Filter             | Typ            | Príklady hodnôt                              |
| ------------------ | -------------- | -------------------------------------------- |
| Rok výstavby       | Rozsah (od-do) | 1200 – 2024                                  |
| Typ strechy        | Výber          | Sedlová, Valbová, Mansardová, Plochá, ...    |
| Materiál fasády    | Výber          | Tehla, Kameň, Drevo, Omietka, ...            |
| Materiál interiéru | Výber          | Drevo, Omietka, Mramor, ...                  |
| Aktuálny stav      | Výber          | Výborný, Dobrý, Zhoršený, Havarijný, ...     |
| Historické obdobie | Výber          | Starovek, Stredovek, Novovek, 19. stor., ... |

Okrem filtrov je dostupné aj **sémantické vyhľadávanie** — používateľ zadá voľný text (napr. „gotický kostol z 15. storočia") a systém nájde najrelevantnejšie budovy pomocou vektorovej podobnosti (pgvector + OpenAI embeddingy).
