-- Add nullable slug column first, backfill existing rows, then enforce NOT NULL + uniqueness.
ALTER TABLE "spaces" ADD COLUMN "slug" TEXT;

-- Backfill: lowercase the name, replace runs of non alphanumeric characters with '-',
-- trim leading/trailing '-', fall back to the row id when the result is empty.
UPDATE "spaces"
SET "slug" = NULLIF(
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(TRIM("name")), '[^a-z0-9]+', '-', 'g')),
  ''
);

UPDATE "spaces" SET "slug" = "id" WHERE "slug" IS NULL;

-- De-duplicate backfilled slugs within the same workspace before adding the unique index.
WITH ranked AS (
  SELECT "id", "workspace_id", "slug",
         ROW_NUMBER() OVER (PARTITION BY "workspace_id", "slug" ORDER BY "created_at") AS rn
  FROM "spaces"
)
UPDATE "spaces" s
SET "slug" = s."slug" || '-' || ranked.rn
FROM ranked
WHERE s."id" = ranked."id" AND ranked.rn > 1;

ALTER TABLE "spaces" ALTER COLUMN "slug" SET NOT NULL;

CREATE UNIQUE INDEX "spaces_workspace_id_slug_key" ON "spaces"("workspace_id", "slug");
