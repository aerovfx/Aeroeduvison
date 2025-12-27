# Quick Start Guide

Get AeroEduVison up and running in 5 minutes!

## 🚀 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Git

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/aerovfx/Aeroeduvison.git
cd Aeroeduvison
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Setup

```bash
# Copy environment template
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/aeroeduvison"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Google Cloud (optional)
GOOGLE_CLOUD_PROJECT="your-project-id"
GOOGLE_CLOUD_BUCKET="your-bucket-name"
```

### 4. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database (optional)
npm run db:seed
```

### 5. Start Development Server

```bash
npm run dev
```

Visit **http://localhost:3000** 🎉

---

## 🔑 Test Accounts

After seeding, use these credentials:

**Teacher Account:**
- Email: `teacher@example.com`
- Password: `teacher123`

**Student Account:**
- Email: `student@example.com`  
- Password: `student123`

---

## ✅ Verify Installation

### 1. Check Homepage
Navigate to http://localhost:3000

### 2. Test Login
Try logging in with test accounts

### 3. Access Dashboard
- **Student:** http://localhost:3000/dashboard
- **Teacher:** http://localhost:3000/teacher

### 4. Explore Features
- Browse courses
- Try interactive labs
- Test AI content generator

---

## 🛠️ Common Issues

### Database Connection Error

```bash
# 1. Check PostgreSQL is running
pg_isready

# 2. Create database
createdb aeroeduvison

# 3. Verify connection string
# Make sure DATABASE_URL format is correct
```

### NextAuth Error

```bash
# Generate a secure secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="<generated-secret>"
```

### Port Already in Use

```bash
# Use a different port
PORT=3001 npm run dev
```

---

## 📚 Next Steps

Now that you're set up:

1. ✅ [Configure Authentication](../authentication/nextauth-setup.md)
2. ✅ [Set Up Python Simulations](../simulations/python-simulations.md)
3. ✅ [Enable OCR Grading](../ocr-grading/overview.md)
4. ✅ [Configure AI Features](../ai-features/content-generator.md)

---

## 🆘 Need Help?

- Check [Troubleshooting Guide](../troubleshooting/common-issues.md)
- View [Full Documentation](../index.md)
- Report issues on [GitHub](https://github.com/aerovfx/Aeroeduvison/issues)
