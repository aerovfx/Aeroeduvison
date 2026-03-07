# Installation Guide

## Prerequisites

Before installing AeroEduVison, ensure you have the following prerequisites:

### System Requirements

- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher (comes with Node.js)
- **Python**: Version 3.12 or higher (for simulations)
- **Git**: For cloning the repository
- **Docker**: For containerized deployment (optional)

### Operating System Support

- **macOS**: 11.0 or later
- **Linux**: Ubuntu 20.04+, CentOS 7+, or equivalent
- **Windows**: Windows 10/11 with WSL2

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/aerovfx/Aeroeduvison.git
cd Aeroeduvison
```

### 2. Install Dependencies

```bash
npm install
```

This will install all Node.js dependencies including:
- Next.js 15 (React framework)
- Prisma (database ORM)
- NextAuth.js (authentication)
- TailwindCSS (styling)
- Contentlayer (documentation)

### 3. Environment Setup

Copy the environment template and configure your variables:

```bash
cp env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aeroeduvison"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google Cloud (for production)
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_STORAGE_BUCKET="your-bucket-name"

# AI Services
GOOGLE_AI_API_KEY="your-gemini-api-key"
OLLAMA_BASE_URL="http://localhost:11434"
```

### 4. Database Setup

#### Option A: Local PostgreSQL

Install PostgreSQL locally and create a database:

```bash
# macOS with Homebrew
brew install postgresql
brew services start postgresql
createdb aeroeduvison

# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb aeroeduvison
```

#### Option B: Docker PostgreSQL

```bash
docker run --name postgres-aeroeduvison \
  -e POSTGRES_DB=aeroeduvison \
  -e POSTGRES_USER=aeroeduvison \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

### 5. Run Database Migrations

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed initial data
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Python Simulations Setup

AeroEduVison includes Python-powered interactive simulations. To enable them:

### Install Python Dependencies

```bash
# Install Python requirements
pip install -r python-simulations/requirements.txt

# Or using pip3
pip3 install -r python-simulations/requirements.txt
```

### Start Python Simulation Server

```bash
# From project root
cd python-simulations
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The simulation server will be available at `http://localhost:8000`.

## OCR Setup (Optional)

For advanced OCR grading features:

### Install OCR Dependencies

```bash
cd python-ocr
pip install -r requirements.txt
```

### Download OCR Models

```bash
python download_models.py
```

## Verification

After installation, verify everything is working:

1. **Frontend**: Visit http://localhost:3000
2. **API**: Check http://localhost:3000/api/health
3. **Simulations**: Visit http://localhost:3000/simulations
4. **Database**: Run `npm run db:generate` to ensure connection

## Troubleshooting

### Common Issues

#### Port Already in Use

If port 3000 is occupied:

```bash
# Use different port
npm run dev -- -p 3001
```

#### Database Connection Failed

1. Verify PostgreSQL is running
2. Check DATABASE_URL in .env.local
3. Ensure database exists: `createdb aeroeduvison`

#### Python Import Errors

```bash
# Upgrade pip
pip install --upgrade pip

# Reinstall requirements
pip install -r python-simulations/requirements.txt --force-reinstall
```

#### Node.js Version Issues

```bash
# Check Node.js version
node --version

# If using nvm, switch to Node 18+
nvm use 18
```

## Next Steps

Once installed, continue with:

- [Environment Setup](./environment-setup.md) - Detailed configuration
- [Quick Start](./quick-start.md) - Your first steps
- [Creating Your First Course](../simulations/quick-start-labs.md) - Hands-on tutorial

---

**Need help?** Check the [Troubleshooting Guide](../troubleshooting/common-issues.md) or join our community.
