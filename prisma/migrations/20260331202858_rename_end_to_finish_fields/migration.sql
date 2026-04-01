/*
  Warnings:

  - You are about to drop the column `endLat` on the `Route` table. All the data in this column will be lost.
  - You are about to drop the column `endLng` on the `Route` table. All the data in this column will be lost.
  - You are about to drop the column `endName` on the `Route` table. All the data in this column will be lost.
  - Added the required column `finishLat` to the `Route` table without a default value. This step will fail if there are existing NULL values in that column.
  - Added the required column `finishLng` to the `Route` table without a default value. This step will fail if there are existing NULL values in that column.
  - Added the required column `finishName` to the `Route` table without a default value. This step will fail if there are existing NULL values in that column.

*/
-- Step 1: Add new columns with data from old columns
ALTER TABLE "Route" ADD COLUMN "finishName" TEXT NOT NULL DEFAULT '';
UPDATE "Route" SET "finishName" = "endName";
ALTER TABLE "Route" ALTER COLUMN "finishName" DROP DEFAULT;

ALTER TABLE "Route" ADD COLUMN "finishLat" DOUBLE PRECISION;
UPDATE "Route" SET "finishLat" = "endLat";
ALTER TABLE "Route" ALTER COLUMN "finishLat" SET NOT NULL;

ALTER TABLE "Route" ADD COLUMN "finishLng" DOUBLE PRECISION;
UPDATE "Route" SET "finishLng" = "endLng";
ALTER TABLE "Route" ALTER COLUMN "finishLng" SET NOT NULL;

-- Step 2: Drop the old columns
ALTER TABLE "Route" DROP COLUMN "endLat";
ALTER TABLE "Route" DROP COLUMN "endLng";
ALTER TABLE "Route" DROP COLUMN "endName";