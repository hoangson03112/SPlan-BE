-- CreateEnum
CREATE TYPE "WorkspaceType" AS ENUM ('PERSONAL', 'TEAM', 'ENTERPRISE');

-- AlterTable
ALTER TABLE "spaces" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workspaces" ADD COLUMN     "type" "WorkspaceType" NOT NULL DEFAULT 'PERSONAL';
