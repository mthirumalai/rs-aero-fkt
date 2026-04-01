-- Rename RouteStatus enum to CourseStatus
ALTER TYPE "RouteStatus" RENAME TO "CourseStatus";

-- Rename Route table to Course
ALTER TABLE "Route" RENAME TO "Course";

-- Rename RoutePhoto table to CoursePhoto
ALTER TABLE "RoutePhoto" RENAME TO "CoursePhoto";

-- Rename RouteStatusHistory table to CourseStatusHistory
ALTER TABLE "RouteStatusHistory" RENAME TO "CourseStatusHistory";

-- Rename routeId column to courseId in CoursePhoto table
ALTER TABLE "CoursePhoto" RENAME COLUMN "routeId" TO "courseId";

-- Rename routeId column to courseId in FktAttempt table
ALTER TABLE "FktAttempt" RENAME COLUMN "routeId" TO "courseId";

-- Rename routeId column to courseId in CourseStatusHistory table
ALTER TABLE "CourseStatusHistory" RENAME COLUMN "routeId" TO "courseId";

-- Update constraint names for CoursePhoto
ALTER TABLE "CoursePhoto" RENAME CONSTRAINT "RoutePhoto_routeId_fkey" TO "CoursePhoto_courseId_fkey";

-- Update constraint names for FktAttempt
ALTER TABLE "FktAttempt" RENAME CONSTRAINT "FktAttempt_routeId_fkey" TO "FktAttempt_courseId_fkey";

-- Update constraint names for CourseStatusHistory
ALTER TABLE "CourseStatusHistory" RENAME CONSTRAINT "RouteStatusHistory_routeId_fkey" TO "CourseStatusHistory_courseId_fkey";

-- Update index names for CourseStatusHistory
ALTER INDEX "RouteStatusHistory_routeId_idx" RENAME TO "CourseStatusHistory_courseId_idx";