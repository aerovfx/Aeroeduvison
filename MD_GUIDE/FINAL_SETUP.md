# Math LMS - Final Setup Guide

## 🎉 Migration Complete!

Your LMS project has been successfully upgraded to:
- ✅ Next.js 15 with App Router
- ✅ NextAuth.js authentication (replaced Clerk)
- ✅ PostgreSQL database with Prisma
- ✅ Custom logo with "math" text

## 🚀 Quick Start

### 1. Environment Setup

Copy the example environment file and update with your values:

```bash
cp env.example .env.local
```

Edit `.env.local` with your actual values:

```env
# Database (REQUIRED)
DATABASE_URL="postgresql://username:password@localhost:5432/lmsmath"

# NextAuth.js (REQUIRED)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Mux (Optional - for video streaming)
MUX_TOKEN_ID="your-mux-token-id"
MUX_TOKEN_SECRET="your-mux-token-secret"

# Uploadthing (Optional - for file uploads)
UPLOADTHING_SECRET="your-uploadthing-secret"
UPLOADTHING_APP_ID="your-uploadthing-app-id"

# Stripe (Optional - for payments)
STRIPE_API_KEY="your-stripe-api-key"
STRIPE_WEBHOOK_SECRET="your-stripe-webhook-secret"
```

### 2. Database Setup

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Create and run migration
npx prisma migrate dev --name init

# Seed database with test data
npm run db:seed
```

### 3. Start Development

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🔑 Test Accounts

After seeding, you can use these accounts:

- **Teacher**: `teacher@example.com` / `teacher123`
- **Student**: `student@example.com` / `student123`

## 📁 Key Changes Made

### Authentication
- ✅ Replaced Clerk with NextAuth.js
- ✅ Added custom sign-in/sign-up pages
- ✅ Implemented password hashing with bcryptjs
- ✅ Added role-based access control

### Database
- ✅ Updated Prisma schema for PostgreSQL
- ✅ Added NextAuth.js models (User, Account, Session, VerificationToken)
- ✅ Added password field to User model
- ✅ Updated relationships and indexes

### UI Components
- ✅ Updated logo to display "math" text
- ✅ Replaced Clerk components with NextAuth.js equivalents
- ✅ Added custom Select component
- ✅ Updated navigation and user menu

### API Routes
- ✅ Updated all API routes to use NextAuth.js
- ✅ Fixed Next.js 15 compatibility (async params)
- ✅ Updated middleware for NextAuth.js

## 🛠️ Features

- **User Authentication**: Sign up, sign in, role-based access
- **Course Management**: Create, edit, publish courses (Teacher role)
- **Course Enrollment**: Browse and enroll in courses (Student role)
- **Progress Tracking**: Track learning progress
- **File Uploads**: Course images and attachments
- **Video Streaming**: Mux integration for course videos

## 🔧 Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL format (should start with `postgresql://`)
- Verify database credentials
- Make sure database `lmsmath` exists

### Authentication Issues
- Make sure NEXTAUTH_SECRET is set
- Check NEXTAUTH_URL matches your domain
- Verify user exists in database

### Build Issues
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check environment variables are set

## 📚 Next Steps

1. **Customize Branding**: Update colors, fonts, and styling
2. **Add Features**: Implement additional LMS features
3. **Deploy**: Deploy to Vercel, Netlify, or your preferred platform
4. **Monitor**: Set up monitoring and analytics

## 🎯 Production Deployment

For production deployment:

1. Set up a production PostgreSQL database
2. Update environment variables with production values
3. Run migrations: `npx prisma migrate deploy`
4. Deploy to your hosting platform

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the console logs for errors
3. Ensure all environment variables are properly set
4. Verify database connection and migrations

---

**Happy coding! 🚀**
