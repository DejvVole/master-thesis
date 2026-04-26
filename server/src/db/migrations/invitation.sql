-- Tabuľka pre pozvánky používateľov
-- Token a expirácia sú v better-auth verification tabuľke
-- Táto tabuľka slúži len na tracking (rola, kto pozval)

DROP TABLE IF EXISTS "invitation";

CREATE TABLE "invitation" (
    "id" SERIAL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',  -- 'user' alebo 'admin'
    "invited_by" TEXT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "accepted_at" TIMESTAMP,
    "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pre lepší výkon
CREATE INDEX IF NOT EXISTS "invitation_email_idx" ON "invitation"("email");
