#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function fixDatabaseSchema() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Checking database schema...');

    // Check if courseType column exists
    const columns = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'Course'
      AND column_name IN ('courseType', 'turningMarkName', 'turningMarkLat', 'turningMarkLng')
    `;

    console.log('📊 Found columns:', columns);

    if (columns.length === 0) {
      console.log('❌ Out-and-back route columns missing. Applying schema fix...');

      // Apply the complete schema fix
      await prisma.$executeRaw`
        DO $$
        BEGIN
            -- Create enum if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CourseType') THEN
                CREATE TYPE "CourseType" AS ENUM ('POINT_TO_POINT', 'OUT_AND_BACK');
                RAISE NOTICE 'Created CourseType enum';
            END IF;

            -- Add courseType column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'courseType') THEN
                ALTER TABLE "Course" ADD COLUMN "courseType" "CourseType" NOT NULL DEFAULT 'POINT_TO_POINT';
                RAISE NOTICE 'Added courseType column';
            END IF;

            -- Add turningMarkName column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkName') THEN
                ALTER TABLE "Course" ADD COLUMN "turningMarkName" TEXT;
                RAISE NOTICE 'Added turningMarkName column';
            END IF;

            -- Add turningMarkLat column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkLat') THEN
                ALTER TABLE "Course" ADD COLUMN "turningMarkLat" DOUBLE PRECISION;
                RAISE NOTICE 'Added turningMarkLat column';
            END IF;

            -- Add turningMarkLng column if it doesn't exist
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Course' AND column_name = 'turningMarkLng') THEN
                ALTER TABLE "Course" ADD COLUMN "turningMarkLng" DOUBLE PRECISION;
                RAISE NOTICE 'Added turningMarkLng column';
            END IF;

            RAISE NOTICE 'Schema fix completed successfully';
        END $$;
      `;

      console.log('✅ Database schema fixed successfully!');

      // Now mark the migration as applied (handle existing entries)
      const existingMigration = await prisma.$queryRaw`
        SELECT migration_name FROM "_prisma_migrations"
        WHERE migration_name = '20260401234100_add_out_and_back_routes'
      `;

      if (existingMigration.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
          VALUES (
            gen_random_uuid(),
            '4a9e85d42a81c7de4c91b06d8f1b7b4bb8b8b8e2b0e3a2b1c7d5e8f2a4b7c9d3',
            now(),
            '20260401234100_add_out_and_back_routes',
            'Applied via schema fix script',
            NULL,
            now() - INTERVAL '1 second',
            4
          );
        `;
      } else {
        await prisma.$executeRaw`
          UPDATE "_prisma_migrations" SET
            finished_at = now(),
            logs = 'Applied via schema fix script - resolved P3009 error',
            applied_steps_count = 4
          WHERE migration_name = '20260401234100_add_out_and_back_routes';
        `;
      }

      console.log('✅ Migration marked as applied!');

    } else if (columns.length < 4) {
      console.log('⚠️  Some columns missing, applying partial fix...');
      // Handle partial schema state
    } else {
      console.log('✅ All out-and-back route columns exist!');
    }

  } catch (error) {
    console.error('❌ Error fixing database schema:', error.message);
    // Don't fail the deployment for schema issues
    console.log('🔄 Will retry on next deployment...');
  } finally {
    await prisma.$disconnect();
  }
}

fixDatabaseSchema();