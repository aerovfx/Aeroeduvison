# Common Issues & Solutions

## Database Connection Issues

### Error: Cannot connect to database

**Solution:**
```bash
# Check PostgreSQL is running
pg_isready

# Verify connection string
echo $DATABASE_URL

# Test connection
psql $DATABASE_URL
```

See: [Guide/TROUBLESHOOTING.md](../../Guide/TROUBLESHOOTING.md)

## Authentication Issues

### Error: NextAuth callback error

**Solution:**
1. Check NEXTAUTH_URL matches your domain
2. Verify NEXTAUTH_SECRET is set
3. Clear browser cookies

See: [Guide/AUTH_FIXES_SUMMARY.md](../../Guide/AUTH_FIXES_SUMMARY.md)

## Build Errors

### Error: Type errors during build

**Solution:**
```bash
# Clear Next.js cache
rm -rf .next

# Regenerate Prisma client
npx prisma generate

# Rebuild
npm run build
```

## OCR Issues

### Low accuracy

**Solutions:**
1. Improve image quality (300+ DPI)
2. Ensure good lighting
3. Use clear handwriting

See: [Guide/OCR_TROUBLESHOOTING.md](../../Guide/OCR_TROUBLESHOOTING.md)

## Performance Issues

### Slow page loads

**Solutions:**
1. Enable caching
2. Optimize images
3. Use CDN for static assets

See: [Guide/PERFORMANCE_OPTIMIZATION.md](../../Guide/PERFORMANCE_OPTIMIZATION.md)

For more issues and solutions, browse the [Guide directory](../../Guide).
