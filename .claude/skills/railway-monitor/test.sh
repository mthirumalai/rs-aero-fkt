#!/bin/bash

# Test Railway Monitor Skill
# Simulates a git push to main and shows how monitoring works

echo "🧪 Testing Railway Monitor Skill"
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Current branch: $CURRENT_BRANCH"

if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "⚠️  Switch to main branch to test: git checkout main"
    exit 1
fi

echo ""
echo "🚀 Simulating git push to main..."
echo "   (In real usage, this happens automatically after 'git push origin main')"
echo ""

# Run monitor directly for testing
echo "📊 Starting Railway deployment monitoring..."
exec ./.claude/skills/railway-monitor/monitor.sh