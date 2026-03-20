#!/bin/bash

# Railway Deployment Monitor
# Automatically monitors Railway deployments after git push

# Load config
source "$(dirname "$0")/.railway-monitor.config" 2>/dev/null || {
    echo "Error: .railway-monitor.config not found"
    exit 1
}

echo "🚀 Monitoring Railway deployment..."

# Wait for Railway to pick up the push
sleep 30

# Monitor deployment status
START_TIME=$(date +%s)
while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    # Check timeout
    if [ $ELAPSED -gt $MONITOR_TIMEOUT ]; then
        echo "⏱️ Monitoring timeout (${MONITOR_TIMEOUT}s)"
        railway logs --tail 50
        exit 1
    fi

    # Get deployment status
    STATUS=$(railway status --json 2>/dev/null | jq -r '.deployments[0].status' 2>/dev/null)

    if [[ -z "$STATUS" || "$STATUS" == "null" ]]; then
        echo "⚠️ Cannot get deployment status"
        sleep $POLL_INTERVAL
        continue
    fi

    case "$STATUS" in
        "ACTIVE")
            echo "✅ Deployment successful!"
            exit 0
            ;;
        "FAILED"|"CRASHED"|"REMOVED")
            echo "❌ Deployment failed (status: $STATUS)"
            echo "📋 Fetching logs..."
            railway logs --tail 100
            exit 1
            ;;
        "BUILDING"|"DEPLOYING"|"WAITING")
            echo "⏳ $STATUS... (${ELAPSED}s elapsed)"
            ;;
        *)
            echo "❓ Unknown status: $STATUS"
            ;;
    esac

    sleep $POLL_INTERVAL
done