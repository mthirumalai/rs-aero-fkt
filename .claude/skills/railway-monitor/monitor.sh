#!/bin/bash

# Railway Deployment Monitor & Auto-Fix
# Automatically monitors deployments after git push to main
# Suggests and implements fixes but requires approval to push

set -e

# Configuration
MONITOR_TIMEOUT=900  # 15 minutes
POLL_INTERVAL=15     # 15 seconds
RAILWAY_APP_URL="https://rs-aero-fkt-production.up.railway.app"
LOG_FILE="/tmp/railway-monitor-$(date +%s).log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}⚠️ $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}❌ $1${NC}" | tee -a "$LOG_FILE"
}

# Check if we're on main branch
check_branch() {
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" ]]; then
        log "Not on main branch (current: $current_branch). Skipping Railway monitoring."
        exit 0
    fi
}

# Wait for Railway to pick up the push
wait_for_railway() {
    log "🚀 Waiting for Railway to detect git push..."
    sleep 30
}

# Get current deployment status
get_deployment_status() {
    railway deployment list | head -2 | tail -1 | awk '{print $4}'
}

get_deployment_id() {
    railway deployment list | head -2 | tail -1 | awk '{print $1}'
}

# Monitor deployment progress
monitor_deployment() {
    log "📊 Starting deployment monitoring..."

    local start_time=$(date +%s)
    local deployment_id=""
    local last_status=""

    while true; do
        local current_time=$(date +%s)
        local elapsed=$((current_time - start_time))

        # Check timeout
        if [ $elapsed -gt $MONITOR_TIMEOUT ]; then
            error "Monitoring timeout (${MONITOR_TIMEOUT}s)"
            return 1
        fi

        # Get current deployment status
        local status=$(get_deployment_status)
        local current_id=$(get_deployment_id)

        # Track deployment ID
        if [[ -z "$deployment_id" ]]; then
            deployment_id="$current_id"
            log "🎯 Monitoring deployment: $deployment_id"
        fi

        # Only log status changes
        if [[ "$status" != "$last_status" ]]; then
            case "$status" in
                "BUILDING")
                    log "🔨 Building... (${elapsed}s elapsed)"
                    ;;
                "DEPLOYING")
                    log "🚀 Deploying... (${elapsed}s elapsed)"
                    ;;
                "SUCCESS")
                    success "Deployment successful! (${elapsed}s total)"
                    verify_deployment
                    return 0
                    ;;
                "FAILED"|"CRASHED"|"REMOVED")
                    error "Deployment failed (status: $status)"
                    analyze_failure "$deployment_id"
                    return 1
                    ;;
                *)
                    log "❓ Status: $status (${elapsed}s elapsed)"
                    ;;
            esac
            last_status="$status"
        fi

        sleep $POLL_INTERVAL
    done
}

# Verify successful deployment
verify_deployment() {
    log "🔍 Verifying deployment health..."

    # Test main page
    if curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_APP_URL" | grep -q "200"; then
        success "Main page responding (200 OK)"
    else
        warning "Main page not responding properly"
        return 1
    fi

    # Test API endpoint
    if curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_APP_URL/api/courses" | grep -q "200"; then
        success "API endpoints responding (200 OK)"
    else
        warning "API endpoints not responding properly"
        return 1
    fi

    success "🎉 Deployment verified successfully!"
    success "🔗 Live at: $RAILWAY_APP_URL"
}

# Analyze deployment failure and suggest fixes
analyze_failure() {
    local deployment_id="$1"
    error "📋 Analyzing deployment failure..."

    # Get failure logs
    local logs=$(railway logs "$deployment_id" 2>/dev/null || railway logs | tail -50)
    echo "$logs" >> "$LOG_FILE"

    # Analyze common failure patterns
    if echo "$logs" | grep -q "migrate found failed migrations"; then
        handle_migration_failure "$logs"
    elif echo "$logs" | grep -q "unsafe use of new value.*enum"; then
        handle_enum_migration_failure "$logs"
    elif echo "$logs" | grep -q "Failed to compile"; then
        handle_build_failure "$logs"
    elif echo "$logs" | grep -q "Cannot find module\|Module not found"; then
        handle_missing_dependency "$logs"
    else
        error "❓ Unknown failure pattern. Manual investigation required."
        echo "📋 Recent logs:"
        echo "$logs" | tail -20
        return 1
    fi
}

# Handle database migration failures
handle_migration_failure() {
    local logs="$1"
    error "🗄️ Database migration failure detected"

    # Extract migration name
    local migration_name=$(echo "$logs" | grep -o "migration_name.*" | head -1 | cut -d'"' -f2)

    if [[ -z "$migration_name" ]]; then
        error "Could not extract migration name from logs"
        return 1
    fi

    cat << EOF

🚨 Railway Deployment Failed - Migration Issue

Issue: Failed database migration blocking deployment
Migration: $migration_name

Root Cause: Migration failed during initial attempt and is now blocking subsequent deployments.

Proposed Fix:
1. Connect to Railway PostgreSQL database
2. Mark the migration as completed manually
3. Re-trigger deployment

Commands to execute:
railway connect postgres << 'SQL'
UPDATE "_prisma_migrations"
SET finished_at = NOW(), applied_steps_count = 1
WHERE migration_name = '$migration_name' AND finished_at IS NULL;
SQL

EOF

    read -p "Apply this fix and redeploy? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_migration_fix "$migration_name"
    else
        log "Fix declined by user"
    fi
}

# Handle enum migration failures
handle_enum_migration_failure() {
    local logs="$1"
    error "🔢 Enum migration failure detected"

    # Extract enum name and value
    local enum_issue=$(echo "$logs" | grep -o 'unsafe use of new value.*of enum type' | head -1)

    cat << EOF

🚨 Railway Deployment Failed - Enum Migration Issue

Issue: PostgreSQL enum constraint violation
Problem: $enum_issue

Root Cause: PostgreSQL requires enum additions and usage to be in separate transactions.

Proposed Fix:
1. Manually add enum value in separate transaction
2. Complete the data migration
3. Mark migration as successful
4. Re-trigger deployment

EOF

    read -p "Apply enum migration fix? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_enum_migration_fix "$logs"
    else
        log "Fix declined by user"
    fi
}

# Handle TypeScript build failures
handle_build_failure() {
    local logs="$1"
    error "🔨 Build failure detected"

    # Extract TypeScript errors
    local ts_errors=$(echo "$logs" | grep -A 5 -B 5 "Failed to compile\|Type error\|Error:")

    cat << EOF

🚨 Railway Deployment Failed - Build Error

Issue: TypeScript compilation failed
Errors:
$ts_errors

Root Cause: Type errors or linting issues preventing successful build.

Next Steps:
1. Review the errors above
2. Fix TypeScript/ESLint issues locally
3. Test with 'npm run build'
4. Commit and push fixes

EOF

    warning "Build failures require manual code fixes. Please resolve the TypeScript errors above."
}

# Apply migration fix
apply_migration_fix() {
    local migration_name="$1"
    log "🔧 Applying migration fix for: $migration_name"

    # Mark migration as completed
    if railway connect postgres << SQL
UPDATE "_prisma_migrations"
SET finished_at = NOW(), applied_steps_count = 1
WHERE migration_name = '$migration_name' AND finished_at IS NULL;
SELECT 'Migration marked as completed' as result;
SQL
    then
        success "Migration fix applied successfully"
        log "🚀 Re-triggering deployment..."
        railway deployment redeploy --yes

        # Monitor the retry
        log "📊 Monitoring retry deployment..."
        monitor_deployment
    else
        error "Failed to apply migration fix"
    fi
}

# Apply enum migration fix
apply_enum_migration_fix() {
    local logs="$1"
    log "🔧 Applying enum migration fix..."

    # This would need specific enum fix logic based on the migration
    warning "Enum fixes require manual database intervention"
    warning "Please check the Railway database and apply enum fixes manually"
}

# Main execution
main() {
    log "🚁 Railway Deployment Monitor Started"
    log "📁 Log file: $LOG_FILE"

    check_branch
    wait_for_railway

    if monitor_deployment; then
        success "🎉 Deployment monitoring completed successfully"
        rm -f "$LOG_FILE"  # Clean up on success
    else
        error "💥 Deployment failed - see analysis above"
        error "📋 Full logs saved to: $LOG_FILE"
        exit 1
    fi
}

# Run main function
main "$@"