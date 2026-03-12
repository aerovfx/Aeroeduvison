# 🏗️ Docker Build Failed - Solutions

## Problem
```
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
```

This means the `npm run build` command failed inside Docker.

---

## 🔍 Common Causes

1. **Missing Dependencies** - Some npm packages not installed
2. **Environment Variables** - Missing or incorrect env vars needed for build
3. **TypeScript Errors** - Compilation errors in the code
4. **Prisma Issues** - Database schema problems
5. **Memory Issues** - Docker ran out of memory
6. **Missing Files** - Required configuration files not found

---

## ✅ Fix Steps

### Step 1: Run Local Diagnostics
This will help identify the actual error:

```bash
chmod +x diagnose-build.sh
./diagnose-build.sh
```

This script will:
- ✅ Check Node.js version
- ✅ Install dependencies
- ✅ Generate Prisma client
- ✅ Run TypeScript check
- ✅ Attempt build locally
- ✅ Show last 50 lines of output

### Step 2: Fix Issues Locally
Once you see the actual error, fix it on your Mac:

```bash
# Install dependencies
npm install

# Generate Prisma
npx prisma generate

# Check for TypeScript errors
npm run type-check

# Try building locally
npm run build
```

### Step 3: Try Docker Build Again
```bash
./deploy-to-gen-lang-client.sh
```

---

## 🛠️ Quick Fixes

### Fix 1: Install Dependencies Properly
```bash
npm ci --legacy-peer-deps
# Or
npm install --legacy-peer-deps
```

### Fix 2: Check Prisma Schema
```bash
npx prisma generate
npx prisma db push --skip-generate
```

### Fix 3: Increase Docker Memory
The Docker container might need more memory. Check Docker Desktop settings:
1. Open Docker Desktop
2. Go to Settings → Resources
3. Increase Memory to 4GB or more
4. Click Apply & Restart

### Fix 4: Clean and Retry
```bash
# Clear Docker cache and rebuild
docker system prune -a
./deploy-to-gen-lang-client.sh
```

### Fix 5: Check Next.js Config
Make sure `next.config.js` is valid:
```bash
# View it
cat next.config.js

# Check for syntax errors
node -c next.config.js
```

---

## 📝 Environment Variables for Build

The Docker build might need these environment variables. Add them to your `.env` file:

```
# Build-time variables
NEXT_PUBLIC_API_URL="https://api.example.com"
NODE_ENV="production"
NEXT_TELEMETRY_DISABLED="1"

# Optional build variables
SKIP_ENV_VALIDATION="1"
```

---

## 🔧 Improved Dockerfile (Already Updated)

I've updated your Dockerfile with better error handling:

- ✅ Better Prisma validation handling
- ✅ Fallback installation method
- ✅ Skip environment validation during build
- ✅ Better error messages

---

## 🚀 Deploy After Fixes

Once you've fixed the build errors locally:

```bash
./deploy-to-gen-lang-client.sh
```

---

## 📊 Step-by-Step Debug Process

### 1. Check the actual error
```bash
./diagnose-build.sh 2>&1 | grep -A 10 "error"
```

### 2. Install dependencies
```bash
npm install --legacy-peer-deps
```

### 3. Generate Prisma
```bash
PRISMA_SKIP_VALIDATION=1 npx prisma generate
```

### 4. Run type check
```bash
npm run type-check 2>&1 | head -30
```

### 5. Try build
```bash
npm run build 2>&1 | tail -50
```

### 6. Fix errors shown in output
Fix the specific TypeScript or JavaScript errors shown

### 7. Retry Docker build
```bash
./deploy-to-gen-lang-client.sh
```

---

## 💡 Common TypeScript Errors

### "Cannot find module"
```bash
npm install <missing-module>
```

### "Type error in file X"
```bash
# Check the file
cat app/path/to/file.ts

# Fix any errors, then rebuild
npm run build
```

### "Prisma type generation failed"
```bash
# Force regenerate
npx prisma generate --force
```

---

## 🎯 Quick Command to Debug

Run this to see the full build output:

```bash
echo "=== Checking dependencies ===" && \
npm ls --depth=0 | head -20 && \
echo "" && \
echo "=== Generating Prisma ===" && \
PRISMA_SKIP_VALIDATION=1 npx prisma generate && \
echo "" && \
echo "=== Building ===" && \
npm run build
```

---

## 📞 If Still Failing

1. **Read the error message carefully** - it usually tells you exactly what's wrong
2. **Fix one error at a time**
3. **Test build locally** with `npm run build`
4. **Only then try Docker** with `./deploy-to-gen-lang-client.sh`

---

**Related Files**:
- [diagnose-build.sh](diagnose-build.sh) - Run this first
- [Dockerfile](Dockerfile) - Updated with better handling
- [DOCKER_TROUBLESHOOTING.md](DOCKER_TROUBLESHOOTING.md) - General Docker help

---

## 🚀 Next Steps

1. **Run diagnostics**:
   ```bash
   ./diagnose-build.sh
   ```

2. **Fix any errors shown**

3. **Deploy again**:
   ```bash
   ./deploy-to-gen-lang-client.sh
   ```

Good luck! 🎉
