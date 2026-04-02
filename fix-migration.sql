-- Safe migration fix for failed out-and-back routes migration
-- This handles both partial failure scenarios gracefully

DO $$
BEGIN
    -- Create enum if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseType') THEN
        CREATE TYPE "CourseType" AS ENUM ('POINT_TO_POINT', 'OUT_AND_BACK');
        RAISE NOTICE 'Created CourseType enum';
    ELSE
        RAISE NOTICE 'CourseType enum already exists';
    END IF;

    -- Add courseType column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'courseType') THEN
        ALTER TABLE "Course" ADD COLUMN "courseType" "CourseType" NOT NULL DEFAULT 'POINT_TO_POINT';
        RAISE NOTICE 'Added courseType column';
    ELSE
        RAISE NOTICE 'courseType column already exists';
    END IF;

    -- Add turningMarkName column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkName') THEN
        ALTER TABLE "Course" ADD COLUMN "turningMarkName" TEXT;
        RAISE NOTICE 'Added turningMarkName column';
    ELSE
        RAISE NOTICE 'turningMarkName column already exists';
    END IF;

    -- Add turningMarkLat column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkLat') THEN
        ALTER TABLE "Course" ADD COLUMN "turningMarkLat" DOUBLE PRECISION;
        RAISE NOTICE 'Added turningMarkLat column';
    ELSE
        RAISE NOTICE 'turningMarkLat column already exists';
    END IF;

    -- Add turningMarkLng column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkLng') THEN
        ALTER TABLE "Course" ADD COLUMN "turningMarkLng" DOUBLE PRECISION;
        RAISE NOTICE 'Added turningMarkLng column';
    ELSE
        RAISE NOTICE 'turningMarkLng column already exists';
    END IF;

    RAISE NOTICE 'Migration fix completed successfully';
END $$;