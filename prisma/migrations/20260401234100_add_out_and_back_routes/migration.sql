-- CreateEnum
-- Note: CourseType enum was created manually
-- CREATE TYPE "CourseType" AS ENUM ('POINT_TO_POINT', 'OUT_AND_BACK');

-- AlterTable
-- Add support for out-and-back routes with turning mark coordinates
ALTER TABLE "Course" ADD COLUMN "courseType" "CourseType" NOT NULL DEFAULT 'POINT_TO_POINT';
ALTER TABLE "Course" ADD COLUMN "turningMarkName" TEXT;
ALTER TABLE "Course" ADD COLUMN "turningMarkLat" DOUBLE PRECISION;
ALTER TABLE "Course" ADD COLUMN "turningMarkLng" DOUBLE PRECISION;