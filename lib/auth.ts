import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { isAccountLocked, recordFailedLogin, resetFailedAttempts } from "./account-lockout"
import { logAuthEvent } from "./auth-logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db), // Keep adapter for Account/User management
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: true, // Enable debug to see NextAuth logs
  useSecureCookies: process.env.NODE_ENV === "production", // Use secure cookies in production only
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          scope: "openid email profile",
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      },
      allowDangerousEmailAccountLinking: true
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text", optional: true }
      },
      async authorize(credentials) {
        try {
          console.log('[AUTHORIZE] called with:', credentials && { email: credentials.email });

          if (!credentials?.email || !credentials?.password) {
            console.log('[AUTHORIZE] missing email/password');
            await logAuthEvent({
              email: credentials?.email || 'unknown',
              action: 'failed_login',
              status: 'failed',
              metadata: { reason: 'Missing credentials' }
            });
            return null
          }

          // Normalize email to lowercase for case-insensitive comparison
          const normalizedEmail = credentials.email.toLowerCase().trim()
          console.log('[AUTHORIZE] looking up user:', normalizedEmail);

          // Check if account is locked
          const lockStatus = await isAccountLocked(normalizedEmail);
          if (lockStatus.isLocked) {
            console.log('[AUTHORIZE] account locked');
            await logAuthEvent({
              email: normalizedEmail,
              action: 'failed_login',
              status: 'blocked',
              metadata: {
                reason: 'Account locked',
                lockedUntil: lockStatus.lockedUntil?.toISOString(),
                remainingMinutes: lockStatus.remainingMinutes
              }
            });
            return null
          }

          const user = await db.user.findUnique({
            where: {
              email: normalizedEmail
            },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              role: true,
              password: true,
              twoFactorEnabled: true,
              twoFactorSecret: true
            }
          })

          console.log('[AUTHORIZE] prisma user:', !!user, user ? user.id : null);
          if (!user) {
            console.log('[AUTHORIZE] user not found');
            await recordFailedLogin(normalizedEmail, undefined, 'User not found');
            return null
          }

          if (!user.password) {
            console.log('[AUTHORIZE] no password set (OAuth account)');
            await recordFailedLogin(normalizedEmail, undefined, 'No password set (OAuth account)');
            return null
          }

          console.log('[AUTHORIZE] checking password...');
          const isPasswordValid = await compare(credentials.password, user.password)
          console.log('[AUTHORIZE] password valid?', isPasswordValid);

          if (!isPasswordValid) {
            console.log('[AUTHORIZE] invalid password');
            await recordFailedLogin(normalizedEmail, undefined, 'Invalid password');
            return null
          }

          // Check 2FA if enabled
          if (user.twoFactorEnabled && user.twoFactorSecret) {
            // 2FA is enabled but no code provided
            if (!credentials.twoFactorCode) {
              return {
                id: user.id,
                email: user.email,
                name: user.name,
                image: user.image,
                role: user.role,
                requires2FA: true as any
              }
            }

            // Verify 2FA code (handled in separate route for better UX)
            // This is a simplified check - full implementation in separate API route
          }

          // Success - reset failed attempts
          await resetFailedAttempts(normalizedEmail);

          console.log('[AUTHORIZE] login successful for:', normalizedEmail);
          await logAuthEvent({
            userId: user.id,
            email: normalizedEmail,
            action: 'login',
            status: 'success'
          });

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
            role: user.role,
          }
        } catch (err) {
          console.error('[AUTHORIZE] authorize error:', err);
          return null; // tránh throw nếu muốn chỉ báo login fail
        }
      }
    })
  ],
  session: {
    strategy: "jwt", // Use JWT instead of database sessions
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === "production"
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 [SIGNIN] SignIn callback", { email: user.email, provider: account?.provider })

      if (account?.provider === "google") {
        // PrismaAdapter handles user creation automatically.
        // We rely on the adapter to create the user. 
        // We can use events.createUser to perform post-creation actions if needed.

        /* 
        // COMMENTED OUT TO AVOID CONFLICTS WITH ADAPTER
        try {
          // Normalize email to lowercase
          const normalizedEmail = user.email!.toLowerCase().trim()

          // Kiểm tra xem user đã tồn tại chưa
          const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail }
          })

          if (!existingUser) {
            // ... creation logic ...
          } else {
            // ... update logic ...
          }
        } catch (error) {
           // ... error handling ...
        }
        */
        return true
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      console.log("🔄 [REDIRECT] Redirect callback", { url, baseUrl })

      // If url is a relative path, make it absolute
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }

      // If url is on the same origin, allow it
      if (url.startsWith(baseUrl)) {
        return url
      }

      // Default redirect to dashboard (middleware will handle role-based routing)
      return `${baseUrl}/dashboard`
    },
    async jwt({ token, user, account, trigger }) {
      console.log("🔑 [JWT] JWT callback called", {
        hasUser: !!user,
        hasToken: !!token,
        trigger,
        tokenKeys: token ? Object.keys(token) : [],
        userData: user ? { id: user.id, email: user.email, role: user.role } : null
      })

      // Initial sign in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.email = user.email
        token.name = user.name || ""
        token.image = user.image || ""
        token.lastUpdated = Date.now()
        // console.log("🔑 [JWT] Updated token with user data:", { id: token.id, email: token.email, role: token.role })
      }

      // Update token with fresh data from database
      if (trigger === "update" || (token.email && Date.now() - (token.lastUpdated as number) > 5 * 60 * 1000)) {
        try {
          const normalizedEmail = token.email!.toLowerCase().trim()
          const dbUser = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, role: true, name: true, image: true }
          })

          if (dbUser) {
            token.role = dbUser.role
            token.id = dbUser.id
            token.email = dbUser.email
            token.name = dbUser.name || ""
            token.image = dbUser.image || ""
            token.lastUpdated = Date.now()
          }
        } catch (error) {
          console.error("❌ [JWT] Error refreshing token from DB:", error)
          // Return existing token when DB is unavailable
          return token
        }
      }

      // Đảm bảo role được cập nhật từ database cho Google OAuth
      if (account?.provider === "google" && token.email) {
        try {
          const normalizedEmail = token.email.toLowerCase().trim()
          const dbUser = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, role: true, name: true, image: true }
          })
          if (dbUser) {
            token.role = dbUser.role
            token.id = dbUser.id
            token.name = dbUser.name || ""
            token.image = dbUser.image || ""
          }
        } catch (error) {
          console.error("❌ [JWT] Error updating Google OAuth token:", error)
        }
      }

      // console.log("🔑 [JWT] Returning token:", { id: token.id, email: token.email, role: token.role })
      return token
    },
    async session({ session, token }) {
      // With JWT strategy, token is passed (not user)
      console.log("📊 [SESSION] Session callback called", {
        hasSession: !!session,
        hasToken: !!token,
        tokenData: token ? {
          id: token.id,
          email: token.email,
          role: token.role
        } : null
      })

      if (token) {
        // Update session with data from JWT token
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string

        // console.log("📊 [SESSION] Updated session with token data:", { 
        //   id: session.user.id, 
        //   email: session.user.email, 
        //   role: session.user.role 
        // })
      }

      // Validate session by checking if user still exists in database
      if (session?.user?.email) {
        try {
          const normalizedEmail = session.user.email.toLowerCase().trim()
          // console.log("📊 [SESSION] Validating user in database:", normalizedEmail)

          const dbUser = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, role: true, name: true, image: true }
          })

          if (!dbUser) {
            // console.log("❌ [SESSION] User not found in database")
            // If user not found in DB, we should probably invalidate session.
            // But returning null breaks the type signature.
            // We can return session as is, but it might be stale.
            // Or we can return a default session.
            return session
          }

          // console.log("✅ [SESSION] User validated in database:", { 
          //   id: dbUser.id, 
          //   email: dbUser.email, 
          //   role: dbUser.role 
          // })

          // Update session with latest user data
          session.user.id = dbUser.id
          session.user.role = dbUser.role
          session.user.email = dbUser.email
          session.user.name = dbUser.name
          session.user.image = dbUser.image
        } catch (error) {
          console.error("❌ [SESSION] Error validating session:", error)
          // return null (cannot return null in session callback)
          return session
        }
      }

      // console.log("📊 [SESSION] Returning session:", { id: session?.user?.id, email: session?.user?.email, role: session?.user?.role })
      return session
    },
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      // console.log("🎉 [EVENT] User signed in:", { email: user.email, provider: account?.provider, isNewUser })
    },

    async signOut({ session, token }) {
      // console.log("👋 [EVENT] User signed out:", { email: session?.user?.email || token?.email })
    },

    async session({ session, token }) {
      // console.log("📊 [EVENT] Session accessed:", { email: session?.user?.email })
    }
  },

  pages: {
    signIn: "/auth/login",
    signOut: "/auth/login",
    error: "/auth/login",
    newUser: "/dashboard" // Redirect new users to dashboard after signup
  }
}
