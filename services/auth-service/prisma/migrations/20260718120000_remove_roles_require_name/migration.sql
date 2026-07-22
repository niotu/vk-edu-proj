-- Backfill missing names before making the column required
UPDATE "users" SET "name" = split_part("email", '@', 1) WHERE "name" IS NULL;

-- AlterTable: name is now required, role is removed
ALTER TABLE "users" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "users" DROP COLUMN "role";

-- DropEnum
DROP TYPE "role";
