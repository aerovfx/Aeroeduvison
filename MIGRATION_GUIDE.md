# Migration Guide: NextAuth to Clerk

This guide helps you migrate from NextAuth.js to Clerk authentication.

## ✅ Completed Steps

1. ✅ Updated `middleware.ts` to use `clerkMiddleware()` from Clerk
2. ✅ Updated `app/layout.tsx` to use `<ClerkProvider>` instead of NextAuth's SessionProvider
3. ✅ Created helper utilities to map NextAuth patterns to Clerk patterns

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_ZHJpdmVuLW1pbm5vdy02Mi5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_BoVUJvuVJpBoLYPaBBqYCUhDPEMGUXqgJmvG3ibKVV
```

**Important:** Never commit these keys to version control!

## 📝 Code Migration Patterns

### Server Components / API Routes

#### Before (NextAuth):
```typescript
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const session = await getServerSession(authOptions);
const userId = session?.user?.id;
const userRole = session?.user?.role;
```

#### After (Clerk):
```typescript
import { getClerkSession, getClerkUserRole } from "@/lib/clerk-helpers";

const session = await getClerkSession();
const userId = session?.userId;
const userRole = await getClerkUserRole();
```

### Client Components

#### Before (NextAuth):
```typescript
import { useSession } from "next-auth/react";

const { data: session, status } = useSession();
const userId = session?.user?.id;
const userRole = session?.user?.role;
```

#### After (Clerk):
```typescript
import { useClerkSession, useClerkUserRole } from "@/lib/clerk-client-helpers";

const { data: session, status } = useClerkSession();
const userId = session?.user?.id;
const userRole = useClerkUserRole();
```

### Authentication Checks

#### Before (NextAuth):
```typescript
const session = await getServerSession(authOptions);
if (!session) {
  redirect('/sign-in');
}
```

#### After (Clerk):
```typescript
import { auth } from "@clerk/nextjs/server";

const { userId } = await auth();
if (!userId) {
  redirect('/sign-in');
}
```

### Sign In / Sign Out

#### Before (NextAuth):
```typescript
import { signIn, signOut } from "next-auth/react";

signIn();
signOut();
```

#### After (Clerk):
```typescript
import { useClerk } from "@clerk/nextjs";

const { signOut } = useClerk();
// Sign in is handled by Clerk's built-in components or redirects
signOut();
```

Or use Clerk's built-in components:
```tsx
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";

<SignInButton />
<SignUpButton />
<UserButton />
```

## 🔄 Role Management

Clerk stores user metadata in `publicMetadata` or `unsafeMetadata`. You'll need to:

1. Set user roles in Clerk Dashboard or via Clerk API
2. Access roles via:
   - Client: `user.publicMetadata.role`
   - Server: `sessionClaims.metadata.role`

## 📦 Helper Utilities

We've created helper utilities in:
- `lib/clerk-helpers.ts` - Server-side helpers
- `lib/clerk-client-helpers.ts` - Client-side hooks

These provide NextAuth-compatible APIs to make migration easier.

## ⚠️ Remaining Tasks

1. Update all components using `useSession` from NextAuth to use `useClerkSession`
2. Update all API routes using `getServerSession` to use `getClerkSession` or `auth()`
3. Configure user roles in Clerk Dashboard
4. Update sign-in/sign-out logic throughout the app
5. Remove NextAuth dependencies once migration is complete

## 🎯 Next Steps

1. Test authentication flow end-to-end
2. Verify role-based access control works correctly
3. Update any custom authentication logic
4. Remove NextAuth packages after successful migration

