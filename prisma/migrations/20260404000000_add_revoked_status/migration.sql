-- Add REVOKED status to CourseStatus enum
ALTER TYPE "CourseStatus" ADD VALUE 'REVOKED';

-- Add REVOKED status to AttemptStatus enum
ALTER TYPE "AttemptStatus" ADD VALUE 'REVOKED';