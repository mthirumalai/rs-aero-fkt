# MacOS Development Setup

This guide covers setting up a MacBook for RS Aero FKT development.

## Prerequisites

### 1. Install Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Install Node.js via nvm
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Restart terminal or source profile
source ~/.zshrc

# Install Node 20 (required for Next.js and Prisma 5)
nvm install 20
nvm use 20
nvm alias default 20
```

### 3. Install Git
```bash
brew install git
```

Configure Git:
```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 4. Install PostgreSQL
```bash
# Install PostgreSQL 15
brew install postgresql@15

# Add to PATH (add to ~/.zshrc for persistence)
echo 'export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Start PostgreSQL service
brew services start postgresql@15

# Create database
createdb rsaerofkt
```

### 5. Install GitHub CLI (recommended)
```bash
brew install gh
gh auth login
```

## Project Setup

### 1. Clone Repository
```bash
git clone https://github.com/mthirumalai/rs-aero-fkt.git
cd rs-aero-fkt
```

### 2. Install Dependencies
```bash
# Ensure Node 20 is active
nvm use 20

# Install packages (use legacy-peer-deps for react-leaflet compatibility)
npm install --legacy-peer-deps
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Generate NextAuth secret
openssl rand -base64 32
```

Edit `.env` with your values:
```env
# Use your actual values
DATABASE_URL="postgresql://$(whoami)@localhost:5432/rsaerofkt"
NEXTAUTH_SECRET="[output from openssl command above]"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"
GOOGLE_CLIENT_SECRET="your-google-oauth-client-secret"
ADMIN_EMAIL="your-email@example.com"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Optional: seed with sample data
npx prisma db seed  # if seed script exists
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Navigate to "APIs & Services" → "Credentials"
4. Click "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env`

## Development Tools (Optional)

### VS Code Extensions
```bash
# Install VS Code
brew install --cask visual-studio-code

# Recommended extensions:
# - ES7+ React/Redux/React-Native snippets
# - Tailwind CSS IntelliSense
# - Prisma
# - ESLint
# - Prettier
```

### Database GUI (Optional)
```bash
# Postico (paid)
brew install --cask postico

# Or pgAdmin (free)
brew install --cask pgadmin4
```

## Verification

Test your setup:
```bash
# Check Node version
node --version  # Should be v20.x.x

# Check PostgreSQL
psql rsaerofkt -c "SELECT version();"

# Check project builds
npm run build

# Start development server
npm run dev
```

Visit `http://localhost:3000` - you should see the RS Aero FKT homepage.

## Troubleshooting

### Node Version Issues
```bash
# If Node version reverts after terminal restart
nvm alias default 20
```

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Restart if needed
brew services restart postgresql@15

# Check database exists
psql postgres -c "\l" | grep rsaerofkt
```

### Permission Issues
```bash
# Fix PostgreSQL permissions
psql postgres -c "ALTER USER $(whoami) WITH SUPERUSER;"
```

### Package Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```