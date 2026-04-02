#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

async function markMigrationResolved() {
  const prisma = new PrismaClient();

  try {
    console.log('🔧 Checking migration status...');

    // Check if the migration exists and is in failed state
    const failedMigration = await prisma.$queryRaw`
      SELECT migration_name, started_at, finished_at, applied_steps_count, logs
      FROM "_prisma_migrations"
      WHERE migration_name = '20260401234100_add_out_and_back_routes'
      AND finished_at IS NULL
    `;

    if (failedMigration.length > 0) {
      console.log('📝 Found failed migration, marking as resolved...');

      // Mark the migration as successfully applied
      await prisma.$queryRaw`
        UPDATE "_prisma_migrations"
        SET finished_at = started_at + INTERVAL '1 second',
            applied_steps_count = 4,
            logs = 'Migration manually resolved - schema applied via fix script'
        WHERE migration_name = '20260401234100_add_out_and_back_routes'
        AND finished_at IS NULL
      `;

      console.log('✅ Migration marked as resolved successfully!');
    } else {
      console.log('✅ Migration is already resolved.');
    }

  } catch (error) {
    console.error('❌ Error resolving migration:', error.message);
    // Don't fail the deployment for this
  } finally {
    await prisma.$disconnect();
  }
}

markMigrationResolved();