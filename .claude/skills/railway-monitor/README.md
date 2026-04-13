# Railway Deployment Monitor & Auto-Fix Skill

Automatically monitors Railway deployments after git pushes to main branch, detects failures, and suggests/implements fixes with user approval.

## ✨ Features

- **🧠 Smart Auto-Trigger**: Analyzes changes and only activates for deployable code
- **📊 Real-time Monitoring**: Tracks build → deploy → success status
- **🕵️ Intelligent Analysis**: Detects common failure patterns
- **🔧 Auto-Fix Suggestions**: Proposes solutions with implementation
- **⚡ Quick Resolution**: Can apply database/migration fixes instantly
- **🛡️ Safe Operation**: Never pushes code without user approval

## 🚀 Quick Start

### 1. Setup (One-time)
```bash
# Install git hooks and configure monitoring
./.claude/skills/railway-monitor/setup.sh
```

### 2. Use
```bash
# Normal workflow - monitoring happens automatically
git add .
git commit -m "Your changes"
git push origin main

# Monitor will start automatically and report status
# On failure, it will suggest fixes and ask for approval
```

### 3. Manual Testing
```bash
# Test the monitor manually
./.claude/skills/railway-monitor/test.sh
```

## 🔧 How It Works

### Smart Triggering 🧠
The monitor **intelligently analyzes** what files changed in your push:

**✅ WILL Monitor When You Change:**
- `src/` - Application source code
- `app/` - Next.js app directory  
- `package.json` - Dependencies
- `prisma/schema.prisma` - Database schema
- `prisma/migrations/` - Database migrations
- Configuration files (`next.config.js`, `tsconfig.json`)

**⏭️ WILL SKIP When You Only Change:**
- `.claude/` - Claude configuration/skills
- `README.md` - Documentation  
- Test files (`.test.`, `.spec.`, `__tests__/`)
- VS Code/IDE settings (`.vscode/`, `.idea/`)
- Linting configs (`.eslintrc`, `.prettierrc`)

### Automatic Workflow
1. **Git Hook Trigger**: Post-push hook detects pushes to main
2. **File Analysis**: Checks what types of files changed
3. **Smart Decision**: Skip monitoring or proceed based on changes
4. **Railway Monitoring**: Watches deployment for 15 minutes max
5. **Status Tracking**: Reports BUILDING → DEPLOYING → SUCCESS/FAILED
6. **Health Verification**: Tests API endpoints on success
7. **Failure Analysis**: Parses logs for known error patterns on failure
8. **Fix Implementation**: Suggests and can apply common fixes

### Supported Auto-Fixes

#### Database Migration Issues ✅
- Failed migrations blocking deployment
- Enum constraint violations 
- Migration tracking table corruption

**Example Fix:**
```sql
UPDATE "_prisma_migrations" 
SET finished_at = NOW() 
WHERE migration_name = 'failed_migration' AND finished_at IS NULL;
```

#### Build Failures ⚠️
- TypeScript compilation errors
- ESLint/test failures
- Missing dependencies

**Action**: Provides error analysis and guidance for manual fixes

#### Runtime Issues ⚠️
- Environment variable problems
- Database connection failures
- Service startup issues

**Action**: Diagnostic information and troubleshooting steps

## 📋 Output Examples

### Success Report
```
✅ Railway Deployment Successful!
🚀 Deployment: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
⏱️ Duration: 2m 34s
🔗 Live: https://rs-aero-fkt-production.up.railway.app
✓ API Health: All endpoints responding
✓ Database: Connected
```

### Failure + Auto-Fix
```
❌ Railway Deployment Failed
🆔 Deployment: a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6
🕐 Failed after: 1m 23s

📋 Issue Analysis:
Migration "20260413_add_new_enum" failed due to PostgreSQL enum constraint.
Root cause: Trying to use new enum value in same transaction as creation.

🔧 Proposed Fix:
1. Mark failed migration as completed
2. Re-trigger deployment

📝 Commands to execute:
UPDATE "_prisma_migrations" SET finished_at = NOW() 
WHERE migration_name = '20260413_add_new_enum';

Apply this fix and redeploy? [y/N]
```

## ⚙️ Configuration

Edit monitoring behavior in the skill files:

**Timing:**
- `MONITOR_TIMEOUT=900` (15 minutes max)
- `POLL_INTERVAL=15` (check every 15 seconds)
- `sleep 30` (wait for Railway to detect push)

**Health Checks:**
- Main page: `https://rs-aero-fkt-production.up.railway.app`
- API endpoint: `/api/courses`

## 📂 File Structure

```
.claude/skills/railway-monitor/
├── SKILL.md          # Skill definition and documentation
├── monitor.sh        # Main monitoring script  
├── setup.sh          # One-time installation
├── test.sh           # Manual testing
└── README.md         # This file
```

**Git Integration:**
- `.git/hooks/post-push` # Auto-trigger on push

**Logs:**
- `/tmp/railway-monitor.log` # Background execution
- `/tmp/railway-monitor-[timestamp].log` # Detailed logs

## 🛡️ Safety Features

- ✅ **Branch Protection**: Only monitors main branch
- ✅ **User Approval**: Never auto-pushes code changes
- ✅ **Clear Explanation**: Shows exactly what each fix does
- ✅ **Timeout Protection**: Stops monitoring after 15 minutes
- ✅ **Log Preservation**: Saves all diagnostic information
- ✅ **Graceful Degradation**: Continues on non-critical errors

## 🔍 Troubleshooting

### Monitor Not Starting
```bash
# Check git hook is executable
ls -la .git/hooks/post-push

# Test Railway CLI
railway --version
railway status
```

### Monitor Running But No Output
```bash
# Check background process
ps aux | grep railway-monitor

# View real-time logs
tail -f /tmp/railway-monitor.log
```

### False Positives
```bash
# Run manual verification
curl -s https://rs-aero-fkt-production.up.railway.app/api/courses
```

## 🎯 Integration with Claude

This skill is designed to work seamlessly with Claude Code:

1. **Automatic Execution**: Triggers via git hooks
2. **Interactive Fixes**: Asks for approval before applying
3. **Detailed Reporting**: Provides analysis for manual review
4. **Safe Operation**: Preserves development workflow

The skill bridges automated monitoring with human oversight, ensuring deployments succeed while maintaining full control over fixes.