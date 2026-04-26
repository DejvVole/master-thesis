-- Better Auth - Tabuľky pre autentifikáciu s Admin pluginom
-- Spusti túto migráciu na vytvorenie potrebných tabuliek

-- Tabuľka používateľov (s admin plugin poliami)
CREATE TABLE IF NOT EXISTS "user" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL UNIQUE,
    "email_verified" BOOLEAN NOT NULL DEFAULT FALSE,
    "role" TEXT NOT NULL DEFAULT 'user',  -- 'user' alebo 'admin'
    "banned" BOOLEAN DEFAULT FALSE,
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabuľka session
CREATE TABLE IF NOT EXISTS "session" (
    "id" TEXT PRIMARY KEY,
    "expires_at" TIMESTAMP NOT NULL,
    "token" TEXT NOT NULL UNIQUE,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- Tabuľka účtov (pre OAuth providery a heslo)
CREATE TABLE IF NOT EXISTS "account" (
    "id" TEXT PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP,
    "refresh_token_expires_at" TIMESTAMP,
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Tabuľka verifikácií (email verification, password reset)
CREATE TABLE IF NOT EXISTS "verification" (
    "id" TEXT PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP NOT NULL,
    "created_at" TIMESTAMP DEFAULT NOW(),
    "updated_at" TIMESTAMP DEFAULT NOW()
);

-- Indexy pre lepší výkon
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session"("user_id");
CREATE INDEX IF NOT EXISTS "session_token_idx" ON "session"("token");
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account"("user_id");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification"("identifier");
CREATE INDEX IF NOT EXISTS "user_role_idx" ON "user"("role");
CREATE INDEX IF NOT EXISTS "user_banned_idx" ON "user"("banned");
