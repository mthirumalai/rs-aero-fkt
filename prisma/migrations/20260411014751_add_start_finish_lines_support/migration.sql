-- CreateEnum
CREATE TYPE "PointType" AS ENUM ('POINT', 'LINE');

-- AlterEnum
ALTER TYPE "CourseType" ADD VALUE 'ONE_WAY';

-- AlterTable
ALTER TABLE "Course" RENAME CONSTRAINT "Route_pkey" TO "Course_pkey";

-- AlterTable
ALTER TABLE "Course"
ADD COLUMN     "finishLine2Lat" DOUBLE PRECISION,
ADD COLUMN     "finishLine2Lng" DOUBLE PRECISION,
ADD COLUMN     "finishType" "PointType" NOT NULL DEFAULT 'POINT',
ADD COLUMN     "startLine2Lat" DOUBLE PRECISION,
ADD COLUMN     "startLine2Lng" DOUBLE PRECISION,
ADD COLUMN     "startType" "PointType" NOT NULL DEFAULT 'POINT';

-- AlterTable
ALTER TABLE "CoursePhoto" RENAME CONSTRAINT "RoutePhoto_pkey" TO "CoursePhoto_pkey";

-- AlterTable
ALTER TABLE "CourseStatusHistory" RENAME CONSTRAINT "RouteStatusHistory_pkey" TO "CourseStatusHistory_pkey";

-- RenameForeignKey
ALTER TABLE "Course" RENAME CONSTRAINT "Route_submittedById_fkey" TO "Course_submittedById_fkey";

-- RenameForeignKey
ALTER TABLE "CourseStatusHistory" RENAME CONSTRAINT "RouteStatusHistory_changedById_fkey" TO "CourseStatusHistory_changedById_fkey";

-- RenameIndex
ALTER INDEX "Route_approvalToken_key" RENAME TO "Course_approvalToken_key";

-- RenameIndex
ALTER INDEX "RouteStatusHistory_changedAt_idx" RENAME TO "CourseStatusHistory_changedAt_idx";

-- Migrate existing data from POINT_TO_POINT to ONE_WAY
UPDATE "Course" SET "courseType" = 'ONE_WAY' WHERE "courseType" = 'POINT_TO_POINT';
