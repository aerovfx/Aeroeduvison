# Math LMS - Quick Start Guide

## 🚀 Quick Setup

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit .env.local with your PostgreSQL credentials
# DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"
```

### 2. Database Setup
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create and run migrations
npx prisma migrate dev --name init

# (Optional) Seed database with sample data
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```

## 🔑 Test Credentials

After seeding the database, you can use these test accounts:

**Teacher Account:**
- Email: `teacher@example.com`
- Password: `teacher123`

**Student Account:**
- Email: `student@example.com`
- Password: `student123`

## 📝 Features

- ✅ Next.js 15 with App Router
- ✅ NextAuth.js authentication with PostgreSQL
- ✅ Role-based access (Student/Teacher)
- ✅ Course management
- ✅ Chapter management
- ✅ User progress tracking
- ✅ Modern UI with Tailwind CSS

## 🛠️ Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format: `postgresql://username:password@localhost:5432/database_name`
- Verify database exists: `createdb lmsmath`

### Authentication Issues
- Make sure NEXTAUTH_SECRET is set in .env.local
- Check NEXTAUTH_URL matches your domain

## 📁 Project Structure

```
app/
├── (auth)/          # Authentication pages
├── (dashboard)/     # Dashboard pages
├── (course)/        # Course pages
├── api/            # API routes
└── globals.css     # Global styles

components/
├── ui/             # Reusable UI components
└── providers/      # Context providers

lib/
├── auth.ts         # NextAuth.js configuration
├── db.ts           # Prisma client
└── utils.ts        # Utility functions

prisma/
├── schema.prisma   # Database schema
└── seed.ts         # Database seeding
```
