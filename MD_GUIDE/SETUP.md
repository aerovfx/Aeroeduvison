# Math LMS - Setup Guide

## Prerequisites

1. Node.js 18+ 
2. PostgreSQL database
3. Git

## Setup Instructions

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# UploadThing (optional)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Mux (optional)
MUX_TOKEN_ID="your-mux-token-id"
MUX_TOKEN_SECRET="your-mux-token-secret"

# Stripe (optional)
STRIPE_API_KEY="your-stripe-api-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

### 2. Database Setup

1. Create a PostgreSQL database named `lmsmath`
2. Update the `DATABASE_URL` in your `.env.local` file with your PostgreSQL credentials
3. Run the following commands:

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name init

# (Optional) Seed the database
npx prisma db seed
```

### 3. Run the Application

```bash
# Start the development server
npm run dev
```

The application will be available at `http://localhost:3000`

## Features

- ✅ Next.js 15 with App Router
- ✅ NextAuth.js authentication
- ✅ Prisma ORM with MySQL
- ✅ Role-based access (Student/Teacher)
- ✅ Course management
- ✅ Chapter management
- ✅ User progress tracking
- ✅ Modern UI with Tailwind CSS

## Default Users

After running the application, you can:

1. Sign up as a Student or Teacher
2. Create courses (Teacher role)
3. Enroll in courses (Student role)
4. Track progress

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check your DATABASE_URL format (should start with postgresql://)
- Verify database credentials
- Make sure the database `lmsmath` exists

### Authentication Issues
- Make sure NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain

### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Check for TypeScript errors with `npm run build`
