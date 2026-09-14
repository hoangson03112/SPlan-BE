-- Space.itemSeq: per-space counter driving Item.number (Jira-style issue codes).
ALTER TABLE "spaces" ADD COLUMN "item_seq" INTEGER NOT NULL DEFAULT 0;

-- Item.number: immutable sequence number assigned at creation time, nullable
-- so existing items (created before this feature) simply have no code.
ALTER TABLE "items" ADD COLUMN "number" INTEGER;

-- Space.key: short project key (e.g. "MKT") used to render issue codes like
-- "MKT-42". Add nullable first, backfill existing rows, then enforce
-- NOT NULL + uniqueness, mirroring the slug backfill migration above.
ALTER TABLE "spaces" ADD COLUMN "key" TEXT;

UPDATE "spaces"
SET "key" = NULLIF(
  UPPER(LEFT(REGEXP_REPLACE("slug", '[^a-zA-Z0-9]', '', 'g'), 10)),
  ''
);

UPDATE "spaces" SET "key" = UPPER(LEFT("id", 6)) WHERE "key" IS NULL;

-- De-duplicate backfilled keys within the same workspace before adding the unique index.
WITH ranked AS (
  SELECT "id", "workspace_id", "key",
         ROW_NUMBER() OVER (PARTITION BY "workspace_id", "key" ORDER BY "created_at") AS rn
  FROM "spaces"
)
UPDATE "spaces" s
SET "key" = s."key" || ranked.rn
FROM ranked
WHERE s."id" = ranked."id" AND ranked.rn > 1;

ALTER TABLE "spaces" ALTER COLUMN "key" SET NOT NULL;

CREATE UNIQUE INDEX "spaces_workspace_id_key_key" ON "spaces"("workspace_id", "key");
