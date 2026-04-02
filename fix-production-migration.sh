#!/bin/bash

echo "🚨 Production Migration Fix for Railway"
echo "This will safely resolve the failed out-and-back routes migration"
echo "🎯 TARGETING: Railway Production Database"
echo ""

# Verify Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first."
    exit 1
fi

# Step 1: Mark the failed migration as rolled back
echo "Step 1: Marking failed migration as rolled back..."
railway run -- npx prisma migrate resolve --rolled-back 20260401234100_add_out_and_back_routes

if [ $? -ne 0 ]; then
    echo "❌ Failed to mark migration as rolled back"
    exit 1
fi

echo "✅ Failed migration marked as rolled back"
echo ""

# Step 2: Apply the fix directly to production database
echo "Step 2: Applying database schema fix..."
railway run -- bash -c "cat fix-migration.sql | npx prisma db execute --stdin"

if [ $? -ne 0 ]; then
    echo "❌ Failed to apply schema fix"
    exit 1
fi

echo "✅ Schema fix applied successfully"
echo ""

# Step 3: Mark the migration as resolved/applied
echo "Step 3: Marking migration as resolved..."
railway run -- npx prisma migrate resolve --applied 20260401234100_add_out_and_back_routes

if [ $? -ne 0 ]; then
    echo "❌ Failed to mark migration as resolved"
    exit 1
fi

echo "✅ Migration marked as resolved"
echo ""

# Step 4: Verify the fix worked
echo "Step 4: Verifying migration status..."
railway run -- npx prisma migrate status

if [ $? -ne 0 ]; then
    echo "❌ Migration status check failed"
    exit 1
fi

echo ""
echo "🎉 Production migration fix completed successfully!"
echo "Your out-and-back routes feature should now work in production."