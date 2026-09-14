-- AlterTable
ALTER TABLE "users" ADD COLUMN     "reset_password_expires" TIMESTAMP(3),
ADD COLUMN     "reset_password_token" TEXT,
ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 0;
