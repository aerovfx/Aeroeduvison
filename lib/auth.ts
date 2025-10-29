import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"
import { isAccountLocked, recordFailedLogin, resetFailedAttempts } from "./account-lockout"
import { logAuthEvent } from "./auth-logger"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db), // Sử dụng PrismaAdapter để lưu sessions vào database
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
      }
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
    strategy: "database" as const, // Sử dụng database sessions với PrismaAdapter
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // Không set domain để tránh vấn đề với __Host- cookies
      },
    },
    csrfToken: {
      name: "__Host-next-auth.csrf-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        // __Host- cookies không được có Domain attribute
      },
    },
    callbackUrl: {
      name: "__Secure-next-auth.callback-url",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    state: {
      name: "__Secure-next-auth.state",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
        maxAge: 900, // 15 minutes
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      // console.log("🔐 [SIGNIN] SignIn callback", { email: user.email, provider: account?.provider })

      if (account?.provider === "google") {
        try {
          // Normalize email to lowercase
          const normalizedEmail = user.email!.toLowerCase().trim()
          
          // Kiểm tra xem user đã tồn tại chưa
          const existingUser = await db.user.findUnique({
            where: { email: normalizedEmail }
          })

          if (!existingUser) {
            // Tạo user mới với role mặc định là STUDENT
            await db.user.create({
              data: {
                email: normalizedEmail,
                name: user.name!,
                image: user.image,
                role: "STUDENT",
                emailVerified: new Date()
              }
            })
            // console.log("✅ [SIGNIN] Created new user:", normalizedEmail)
          } else {
            // Cập nhật thông tin user nếu cần
            await db.user.update({
              where: { email: normalizedEmail },
              data: {
                name: user.name!,
                image: user.image,
                emailVerified: new Date()
              }
            })
            // console.log("✅ [SIGNIN] Updated existing user:", normalizedEmail)
          }
        } catch (error) {
          console.error("❌ [SIGNIN] Database error:", error)
          return false // Prevent sign in on DB error
        }
      }
      return true
    },
    async redirect({ url, baseUrl }) {
      // console.log("🔄 [REDIRECT] Redirect callback", { url, baseUrl })
      
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
      // console.log("🔑 [JWT] JWT callback called", { 
      //   hasUser: !!user, 
      //   hasToken: !!token, 
      //   trigger,
      //   tokenKeys: token ? Object.keys(token) : [],
      //   userData: user ? { id: user.id, email: user.email, role: user.role } : null
      // })
      
      // Initial sign in
      if (user) {
        token.role = user.role
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
        token.lastUpdated = Date.now()
        // console.log("🔑 [JWT] Updated token with user data:", { id: token.id, email: token.email, role: token.role })
      }
      
      // Update token with fresh data from database
      if (trigger === "update" || (token.email && Date.now() - (token.lastUpdated as number) > 5 * 60 * 1000)) {
        // console.log("🔄 [JWT] Refreshing token data from database")
        const normalizedEmail = token.email!.toLowerCase().trim()
        const dbUser = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, role: true, name: true, image: true }
        })
        
        if (dbUser) {
          token.role = dbUser.role
          token.id = dbUser.id
          token.email = dbUser.email
          token.name = dbUser.name
          token.image = dbUser.image
          token.lastUpdated = Date.now()
          // console.log("✅ [JWT] Token refreshed with DB data:", { id: token.id, email: token.email, role: token.role })
        } else {
          // console.log("❌ [JWT] User not found in database, invalidating token")
          return null
        }
      }
      
      // Đảm bảo role được cập nhật từ database cho Google OAuth
      if (account?.provider === "google" && token.email) {
        const normalizedEmail = token.email.toLowerCase().trim()
        const dbUser = await db.user.findUnique({
          where: { email: normalizedEmail },
          select: { id: true, email: true, role: true, name: true, image: true }
        })
        if (dbUser) {
          token.role = dbUser.role
          token.id = dbUser.id
          token.name = dbUser.name
          token.image = dbUser.image
          // console.log("✅ [JWT] Updated token for Google OAuth user:", { id: token.id, email: token.email, role: token.role })
        }
      }
      
      // console.log("🔑 [JWT] Returning token:", { id: token.id, email: token.email, role: token.role })
      return token
    },
    async session({ session, user }) {
      // Với database sessions, user object được truyền trực tiếp từ database
      // console.log("📊 [SESSION] Session callback called", { 
      //   hasSession: !!session, 
      //   hasUser: !!user,
      //   userData: user ? { 
      //     id: user.id, 
      //     email: user.email, 
      //     role: user.role 
      //   } : null
      // })
      
      if (user) {
        // Với database sessions, user object chứa đầy đủ thông tin từ database
        session.user.id = user.id
        session.user.role = user.role
        session.user.email = user.email
        session.user.name = user.name
        session.user.image = user.image
        
        // console.log("📊 [SESSION] Updated session with user data:", { 
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
            // console.log("❌ [SESSION] User not found in database, invalidating session")
            return null
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
          return null
        }
      }
      
      // console.log("📊 [SESSION] Returning session:", { id: session?.user?.id, email: session?.user?.email, role: session?.user?.role })
      return session
    },
    async redirect({ url, baseUrl }) {
      // If url is relative, append to baseUrl
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // If url is on same origin, allow it
      if (new URL(url).origin === baseUrl) return url
      // Otherwise redirect to baseUrl
      return baseUrl
    }
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
