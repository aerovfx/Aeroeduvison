# Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. 404 Error - Page Not Found

**Symptoms:**
- Getting 404 error when accessing pages
- "This page could not be found" message

**Solutions:**
1. **Check if development server is running:**
   ```bash
   npm run dev
   ```

2. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

3. **Test basic functionality:**
   - Visit `/test-simple` - should show basic page
   - Visit `/test-all` - should show system test results

### 2. Database Connection Issues

**Symptoms:**
- "Database connection failed" errors
- Prisma errors

**Solutions:**
1. **Check environment variables:**
   ```bash
   # Make sure .env.local exists and has correct DATABASE_URL
   cat .env.local
   ```

2. **Test database connection:**
   - Visit `/test-db` - should show database status
   - Visit `/api/test-db` - should show API database test

3. **Run database setup:**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   npm run db:seed
   ```

### 3. NextAuth.js Issues

**Symptoms:**
- Authentication not working
- Session errors

**Solutions:**
1. **Check NextAuth.js configuration:**
   - Visit `/test-nextauth` - should show NextAuth status
   - Visit `/api/test-auth` - should show API NextAuth test

2. **Verify environment variables:**
   ```bash
   # Make sure these are set in .env.local
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-here
   ```

### 4. Build Issues

**Symptoms:**
- Build fails with errors
- TypeScript errors

**Solutions:**
1. **Clear cache and rebuild:**
   ```bash
   rm -rf .next
   rm -rf node_modules
   npm install
   npm run build
   ```

2. **Check for missing dependencies:**
   ```bash
   npm install @types/bcryptjs
   ```

### 5. Port Issues

**Symptoms:**
- Port 3000 already in use
- Server won't start

**Solutions:**
1. **Kill existing processes:**
   ```bash
   pkill -f "next dev"
   ```

2. **Use different port:**
   ```bash
   npm run dev -- -p 3001
   ```

## 🔧 Diagnostic Commands

### Test System Health
```bash
# Test all components
curl http://localhost:3000/api/test
curl http://localhost:3000/api/test-db
curl http://localhost:3000/api/test-auth
```

### Check Database
```bash
# Test database connection
npx prisma db push
npx prisma studio
```

### Check Environment
```bash
# Verify environment variables
node -e "console.log(process.env.DATABASE_URL)"
node -e "console.log(process.env.NEXTAUTH_SECRET)"
```

## 📋 Test URLs

Use these URLs to diagnose issues:

- `/test-simple` - Basic page rendering test
- `/test-db` - Database connection test
- `/test-nextauth` - NextAuth.js test
- `/test-all` - Comprehensive system test
- `/api/test` - Basic API test
- `/api/test-db` - API database test
- `/api/test-auth` - API NextAuth test

## 🆘 Still Having Issues?

1. **Check the console logs** for specific error messages
2. **Verify all environment variables** are set correctly
3. **Ensure database is running** and accessible
4. **Try the diagnostic commands** above
5. **Check the test URLs** to isolate the problem

## 📞 Quick Fixes

### Reset Everything
```bash
# Stop all processes
pkill -f "next dev"

# Clean everything
rm -rf .next
rm -rf node_modules

# Reinstall and start
npm install
npm run dev
```

### Database Reset
```bash
# Reset database
npx prisma migrate reset
npx prisma migrate dev --name init
npm run db:seed
```

---

**Remember:** Most issues can be resolved by clearing the Next.js cache and restarting the development server!
