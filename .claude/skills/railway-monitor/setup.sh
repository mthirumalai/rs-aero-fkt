#!/bin/bash

# Setup Railway Monitor Git Integration
# This script sets up the git hooks to automatically trigger monitoring

set -e

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"
SKILL_DIR="$REPO_ROOT/.claude/skills/railway-monitor"

echo "🔧 Setting up Railway Deployment Monitor..."

# Ensure hooks directory exists
mkdir -p "$HOOKS_DIR"

# Create or update post-push hook
HOOK_FILE="$HOOKS_DIR/post-push"

cat << 'EOF' > "$HOOK_FILE"
#!/bin/bash

# Auto-trigger Railway monitoring after git push
# Only monitors pushes to main branch that affect deployable code

# Get the branch being pushed
while read oldrev newrev refname; do
    branch=$(git rev-parse --symbolic --abbrev-ref $refname 2>/dev/null || echo $refname | sed 's/refs\/heads\///')

    if [[ "$branch" == "main" ]]; then
        echo "🚁 Git push to main detected - analyzing changes..."

        # Get list of changed files in this push
        changed_files=$(git diff --name-only $oldrev..$newrev 2>/dev/null || git diff --name-only HEAD~1..HEAD)

        # Define patterns for files that affect deployment
        deployable_patterns=(
            "^src/"                    # Source code
            "^app/"                    # Next.js app directory
            "^pages/"                  # Next.js pages (if used)
            "^components/"             # React components (if in root)
            "^lib/"                    # Library code (if in root)
            "^public/"                 # Public assets
            "^prisma/schema.prisma"    # Database schema
            "^prisma/migrations/"      # Database migrations
            "^package\.json$"          # Dependencies
            "^package-lock\.json$"     # Lock file
            "^yarn\.lock$"             # Yarn lock
            "^pnpm-lock\.yaml$"        # PNPM lock
            "^next\.config"            # Next.js config
            "^tailwind\.config"        # Tailwind config
            "^tsconfig\.json$"         # TypeScript config
            "^\.env"                   # Environment files
            "^Dockerfile$"             # Docker config
            "^railway\.json$"          # Railway config
        )

        # Define patterns for files that DON'T affect deployment
        non_deployable_patterns=(
            "^\.claude/"               # Claude configuration
            "^\.git/"                  # Git internals
            "^\.vscode/"               # VS Code settings
            "^\.idea/"                 # IntelliJ settings
            "^README\.md$"             # Documentation
            "^CHANGELOG\.md$"          # Changelog
            "^LICENSE"                 # License files
            "^\.gitignore$"            # Git ignore
            "^\.eslintrc"              # ESLint config (doesn't affect runtime)
            "^\.prettierrc"            # Prettier config
            "^jest\.config"            # Jest config (tests don't deploy)
            "^playwright\.config"      # Playwright config
            "\.test\."                 # Test files
            "\.spec\."                 # Spec files
            "^__tests__/"              # Test directories
            "^tests/"                  # Test directories
            "\.md$"                    # Markdown files
            "^docs/"                   # Documentation directory
        )

        # Check if any changed files affect deployment
        needs_monitoring=false

        # First, exclude non-deployable files
        relevant_files=""
        while IFS= read -r file; do
            skip_file=false

            # Check if file matches non-deployable patterns
            for pattern in "${non_deployable_patterns[@]}"; do
                if [[ $file =~ $pattern ]]; then
                    skip_file=true
                    break
                fi
            done

            # If not excluded, add to relevant files
            if [[ $skip_file == false ]]; then
                relevant_files="${relevant_files}${file}\n"
            fi
        done <<< "$changed_files"

        # Check if remaining files match deployable patterns
        while IFS= read -r file; do
            [[ -z "$file" ]] && continue

            for pattern in "${deployable_patterns[@]}"; do
                if [[ $file =~ $pattern ]]; then
                    needs_monitoring=true
                    echo "📦 Deployable change detected: $file"
                    break
                fi
            done

            [[ $needs_monitoring == true ]] && break
        done <<< "$relevant_files"

        # If we found deployable changes, start monitoring
        if [[ $needs_monitoring == true ]]; then
            echo "🚀 Deployable changes found - starting Railway monitoring..."

            # Run monitor in background to avoid blocking push
            nohup "$(git rev-parse --show-toplevel)/.claude/skills/railway-monitor/monitor.sh" > /tmp/railway-monitor.log 2>&1 &

            echo "📊 Railway monitoring started in background"
            echo "💡 Monitor progress with: tail -f /tmp/railway-monitor.log"
        else
            echo "📝 Only non-deployable files changed (docs, config, etc.)"
            echo "⏭️  Skipping Railway monitoring"

            # Show what was changed for transparency
            if [[ -n "$changed_files" ]]; then
                echo "📋 Changed files:"
                echo "$changed_files" | sed 's/^/   /'
            fi
        fi
    fi
done
EOF

# Make hook executable
chmod +x "$HOOK_FILE"

# Test if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "⚠️  Warning: Railway CLI not found. Please install it:"
    echo "   npm install -g @railway/cli"
    echo "   railway login"
fi

# Test git hooks
if [[ -x "$HOOK_FILE" ]]; then
    echo "✅ Post-push hook installed successfully"
else
    echo "❌ Failed to install post-push hook"
    exit 1
fi

echo ""
echo "🎉 Railway Monitor Setup Complete!"
echo ""
echo "How it works:"
echo "  1. Push to main branch: git push origin main"
echo "  2. Hook analyzes changed files intelligently"
echo "  3. Skips monitoring for docs/config-only changes"
echo "  4. Triggers monitoring for deployable code changes"
echo "  5. Monitor runs in background for 15 minutes"
echo "  6. On failure, suggests fixes and asks for approval"
echo "  7. On success, verifies deployment health"
echo ""
echo "🧠 Smart triggering - monitors only when needed:"
echo "  ✅ Triggers: src/, app/, package.json, schema changes"
echo "  ⏭️  Skips: .claude/, README.md, test files, docs"
echo ""
echo "Manual usage:"
echo "  .claude/skills/railway-monitor/monitor.sh"
echo ""
echo "Logs location:"
echo "  /tmp/railway-monitor.log (background runs)"
echo "  /tmp/railway-monitor-[timestamp].log (detailed logs)"