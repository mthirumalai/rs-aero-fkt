#!/bin/bash

# Test Smart Railway Monitor Triggering
# Demonstrates when monitoring will/won't trigger based on file changes

echo "🧪 Testing Smart Railway Monitor Triggering"
echo ""

# Function to simulate file change analysis
test_file_pattern() {
    local file="$1"
    local description="$2"

    # Patterns from the git hook
    deployable_patterns=(
        "^src/" "^app/" "^pages/" "^components/" "^lib/" "^public/"
        "^prisma/schema.prisma" "^prisma/migrations/"
        "^package\.json$" "^package-lock\.json$"
        "^next\.config" "^tailwind\.config" "^tsconfig\.json$"
        "^\.env" "^Dockerfile$" "^railway\.json$"
    )

    non_deployable_patterns=(
        "^\.claude/" "^\.git/" "^\.vscode/" "^\.idea/"
        "^README\.md$" "^CHANGELOG\.md$" "^LICENSE" "^\.gitignore$"
        "^\.eslintrc" "^\.prettierrc" "^jest\.config" "^playwright\.config"
        "\.test\." "\.spec\." "^__tests__/" "^tests/" "\.md$" "^docs/"
    )

    # Check if file should be excluded
    for pattern in "${non_deployable_patterns[@]}"; do
        if [[ $file =~ $pattern ]]; then
            echo "⏭️  SKIP  $file - $description"
            echo "      Reason: Non-deployable file pattern"
            return
        fi
    done

    # Check if file should trigger monitoring
    for pattern in "${deployable_patterns[@]}"; do
        if [[ $file =~ $pattern ]]; then
            echo "🚀 MONITOR $file - $description"
            echo "      Reason: Deployable code change"
            return
        fi
    done

    echo "❓ UNKNOWN $file - $description"
    echo "      Reason: No matching pattern (would skip)"
}

echo "📋 Testing various file change scenarios:"
echo ""

# Test deployable files
echo "🔥 Files that WILL trigger Railway monitoring:"
test_file_pattern "src/components/NewComponent.tsx" "New React component"
test_file_pattern "src/app/api/users/route.ts" "New API endpoint"
test_file_pattern "package.json" "Dependency update"
test_file_pattern "prisma/schema.prisma" "Database schema change"
test_file_pattern "prisma/migrations/20260413_new_feature.sql" "New migration"
test_file_pattern "next.config.js" "Next.js configuration"

echo ""
echo "⏭️  Files that WILL SKIP Railway monitoring:"
test_file_pattern ".claude/skills/new-skill/SKILL.md" "New Claude skill"
test_file_pattern "README.md" "Documentation update"
test_file_pattern ".vscode/settings.json" "VS Code settings"
test_file_pattern "src/components/__tests__/Button.test.tsx" "Test file"
test_file_pattern ".eslintrc.json" "ESLint configuration"
test_file_pattern "docs/api-guide.md" "Documentation"

echo ""
echo "🎯 Summary:"
echo "   ✅ Smart triggering prevents unnecessary Railway monitoring"
echo "   📝 Documentation and config changes won't waste monitoring time"
echo "   🚀 Code changes still get full monitoring and auto-fix support"
echo ""
echo "💡 To test this for real:"
echo "   1. Make changes to only .claude/ files"
echo "   2. git add . && git commit -m 'Update Claude config'"
echo "   3. git push origin main"
echo "   4. Should see: 'Only non-deployable files changed - Skipping Railway monitoring'"