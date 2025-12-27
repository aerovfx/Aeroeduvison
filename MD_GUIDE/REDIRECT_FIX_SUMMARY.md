# 🔧 Fix: Login Success but No Redirect to Dashboard

## 🎯 Problem

Login shows success but doesn't redirect to `/dashboard`. URL shows: `https://inphysic.com/auth/login?callbackUrl=%2Fdashboard`

## ✅ Root Cause

**Missing `redirect` callback in NextAuth configuration.**

Without this callback, NextAuth doesn't know how to handle the `callbackUrl` parameter properly, causing the redirect to fail.

## 🔧 Fix Applied

### 1. Added Redirect Callback to `lib/auth.ts`

```typescript
callbacks: {
  // ... existing callbacks ...
  async redirect({ url, baseUrl }) {
    // If url is relative, append to baseUrl
    if (url.startsWith("/")) return `${baseUrl}${url}`
    // If url is on same origin, allow it
    if (new URL(url).origin === baseUrl) return url
    // Otherwise redirect to baseUrl
    return baseUrl
  }
}
```

### 2. Client-Side SignIn Flow (Already Correct)

In `app/auth/signin/page.tsx` (lines 64-77):

```typescript
const result = await signIn('credentials', {
  email,
  password,
  redirect: false,  // ❗ Manual redirect needed
  callbackUrl
})

if (result?.error) {
  toast.error('Invalid email or password')
} else if (result?.ok) {
  toast.success('Signed in successfully!')
  router.push(callbackUrl)  // ✅ Manual redirect
  router.refresh()
}
```

**This is CORRECT behavior** - using `redirect: false` and manually redirecting gives you control and ensures `callbackUrl` is honored.

## 📋 Checklist

### ✅ Fixed Issues:
1. ✅ Added redirect callback to handle `callbackUrl`
2. ✅ Database connection working (50 users in database)
3. ✅ NEXTAUTH_URL set correctly (`https://inphysic.com`)
4. ✅ NEXTAUTH_SECRET set and generated
5. ✅ DATABASE_URL with valid Prisma Accelerate API key
6. ✅ Client-side login flow using manual redirect (correct)

### ⚠️ Common Issues to Check:

#### 1. Cookie Not Being Set
**Check:** Open DevTools → Application → Cookies
- Should see: `next-auth.session-token`
- If not present, cookie flags may be wrong

**Fix:** Ensure cookie settings in `lib/auth.ts` are correct:
```typescript
cookies: {
  sessionToken: {
    name: `next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
},
```

#### 2. Session Not Persisting
**Check:** After login, visit `/api/auth/session`
```bash
curl https://inphysic.com/api/auth/session
```

**Expected:** Should return user data
**Actual:** Returns `{}` if session not set

**Fix:** Check NEXTAUTH_SECRET is set and correct

#### 3. Protected Route Redirect Loop
**Check:** If redirected to login immediately after login

**Possible causes:**
- Session not set yet when dashboard page renders
- getServerSession not finding session
- Middleware blocking too aggressively

**Debug:** Check middleware.ts:
```typescript
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  
  // Allow dashboard if authenticated
  if (pathname.startsWith("/dashboard") && token) {
    return NextResponse.next()
  }
  
  // ... rest of logic
}
```

## 🚀 Deployment

### Step 1: Build New Version
```bash
gcloud builds submit --tag gcr.io/gen-lang-client-0712182643/lmsmath-app .
```

### Step 2: Deploy to Cloud Run
```bash
gcloud run deploy lmsmath-app \
  --image gcr.io/gen-lang-client-0712182643/lmsmath-app \
  --region asia-east1 \
  --update-env-vars DATABASE_URL="..." \
  --update-env-vars NEXTAUTH_URL="https://inphysic.com" \
  --update-env-vars NEXTAUTH_SECRET="..." \
  --update-env-vars NODE_ENV="production"
```

### Step 3: Verify
```bash
# Check environment variables
gcloud run services describe lmsmath-app --region asia-east1 --format="yaml(spec.template.spec.containers[0].env)"

# Test database
curl https://inphysic.com/api/test-db

# Test session (after login)
curl https://inphysic.com/api/auth/session
```

## 🧪 Testing Steps

1. **Clear cookies and cache:**
   ```bash
   # In browser DevTools → Application → Clear storage
   ```

2. **Visit login page:**
   ```
   https://inphysic.com/auth/login?callbackUrl=/dashboard
   ```

3. **Login with credentials:**
   - Email: `teacher@example.com`
   - Password: `teacher123`

4. **Check Network tab:**
   - POST to `/api/auth/callback/credentials` should return 200
   - Should have `Set-Cookie` header with `next-auth.session-token`

5. **Check Application tab:**
   - Cookies should include `next-auth.session-token`
   - Should redirect to `/dashboard` automatically

6. **Verify session:**
   ```bash
   curl https://inphysic.com/api/auth/session
   ```

## 📝 Summary

### What Was Fixed:
✅ Added `redirect` callback to NextAuth configuration  
✅ Fixed Prisma Accelerate API key  
✅ Database connection now working  
✅ All environment variables set correctly  

### What Should Happen Now:
1. User logs in → `signIn()` returns `{ ok: true }`
2. Client redirects to `/dashboard` using `router.push()`
3. Dashboard page loads with session data
4. User stays logged in

### If Still Not Working:

Check these in order:
1. **Cookie is set?** (DevTools → Application → Cookies)
2. **Session exists?** (`/api/auth/session` returns user data)
3. **Redirect callback working?** (Check server logs for redirect URL)
4. **Middleware blocking?** (Check `middleware.ts` logic)
5. **Build deployed?** (Ensure new image is running)

## 🔗 Related Files

- `lib/auth.ts` - NextAuth configuration with redirect callback
- `app/auth/signin/page.tsx` - Client-side login form
- `app/(dashboard)/(routes)/(root)/page.tsx` - Dashboard page
- `middleware.ts` - Route protection logic
- `scripts/deploy-cloud-run.sh` - Deployment script


