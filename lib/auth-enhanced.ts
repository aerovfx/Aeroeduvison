import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"

export const authOptionsEnhanced: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
  useSecureCookies: process.env.NODE_ENV === "production",
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("🔐 [AUTHORIZE] Start", { email: credentials?.email })
        
        if (!credentials?.email || !credentials?.password) {
          console.log("❌ [AUTHORIZE] Missing credentials")
          return null
        }

        // Normalize email to lowercase for case-insensitive comparison
        const normalizedEmail = credentials.email.toLowerCase().trim()
        console.log("📧 [AUTHORIZE] Email normalized:", credentials.email, "→", normalizedEmail)

        const user = await db.user.findUnique({
          where: {
            email: normalizedEmail
          }
        })

        if (!user) {
          console.log("❌ [AUTHORIZE] User not found:", normalizedEmail)
          return null
        }
        
        console.log("✅ [AUTHORIZE] User found:", user.id, user.email)

        if (!user.password) {
          console.log("❌ [AUTHORIZE] User has no password (OAuth user)")
          return null
        }
        
        console.log("✅ [AUTHORIZE] User has password")

        const isPasswordValid = await compare(credentials.password, user.password)
        console.log("🔑 [AUTHORIZE] Password check:", isPasswordValid)
        
        if (!isPasswordValid) {
          console.log("❌ [AUTHORIZE] Invalid password")
          return null
        }

        console.log("✅ [AUTHORIZE] Success! Returning user:", { id: user.id, email: user.email, role: user.role })
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      }
    })
  ],
  
  session: {
    strategy: "jwt" as const,
    maxAge: 24 * 60 * 60, // 1 day
    updateAge: 60 * 60, // Update every hour
  },
  
  jwt: {
    maxAge: 24 * 60 * 60, // 1 day
  },
  
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("🔐 [SIGNIN] SignIn callback", { 
        email: user.email, 
        provider: account?.provider 
      })

      if (account?.provider === "google") {
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
          console.log("✅ [SIGNIN] Created new user:", normalizedEmail)
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
          console.log("✅ [SIGNIN] Updated existing user:", normalizedEmail)
        }
      }
      return true
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
        token.name = user.name
        token.image = user.image
        token.lastUpdated = Date.now()
        console.log("🔑 [JWT] Updated token with user data:", { 
          id: token.id, 
          email: token.email, 
          role: token.role 
        })
      }
      
      // Update token with fresh data from database
      if (trigger === "update" || (token.email && Date.now() - (token.lastUpdated as number) > 5 * 60 * 1000)) {
        console.log("🔄 [JWT] Refreshing token data from database")
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
          console.log("✅ [JWT] Token refreshed with DB data:", { 
            id: token.id, 
            email: token.email, 
            role: token.role 
          })
        } else {
          console.log("❌ [JWT] User not found in database, invalidating token")
          return null
        }
      }
      
      // Ensure role is updated from database for Google OAuth
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
          console.log("✅ [JWT] Updated token for Google OAuth user:", { 
            id: token.id, 
            email: token.email, 
            role: token.role 
          })
        }
      }
      
      console.log("🔑 [JWT] Returning token:", { 
        id: token.id, 
        email: token.email, 
        role: token.role 
      })
      return token
    },
    
    async session({ session, token }) {
      console.log("📊 [SESSION] Session callback called", { 
        hasSession: !!session, 
        hasToken: !!token,
        tokenData: token ? { 
          id: token.id, 
          email: token.email, 
          role: token.role,
          lastUpdated: token.lastUpdated 
        } : null
      })
      
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string
        
        console.log("📊 [SESSION] Updated session with token data:", { 
          id: session.user.id, 
          email: session.user.email, 
          role: session.user.role 
        })
      }
      
      // Validate session by checking if user still exists in database
      if (session?.user?.email) {
        try {
          const normalizedEmail = session.user.email.toLowerCase().trim()
          console.log("📊 [SESSION] Validating user in database:", normalizedEmail)
          
          const user = await db.user.findUnique({
            where: { email: normalizedEmail },
            select: { id: true, email: true, role: true, name: true, image: true }
          })
          
          if (!user) {
            console.log("❌ [SESSION] User not found in database, invalidating session")
            return null
          }
          
          console.log("✅ [SESSION] User validated in database:", { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          })
          
          // Update session with latest user data
          session.user.id = user.id
          session.user.role = user.role
          session.user.email = user.email
          session.user.name = user.name
          session.user.image = user.image
        } catch (error) {
          console.error("❌ [SESSION] Error validating session:", error)
          return null
        }
      }
      
      console.log("📊 [SESSION] Returning session:", { 
        id: session?.user?.id, 
        email: session?.user?.email, 
        role: session?.user?.role 
      })
      return session
    }
  },
  
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("🎉 [EVENT] User signed in:", { 
        email: user.email, 
        provider: account?.provider,
        isNewUser 
      })
    },
    
    async signOut({ session, token }) {
      console.log("👋 [EVENT] User signed out:", { 
        email: session?.user?.email || token?.email 
      })
    },
    
    async session({ session, token }) {
      console.log("📊 [EVENT] Session accessed:", { 
        email: session?.user?.email 
      })
    }
  },
  
  pages: {
    signIn: "/",
    signOut: "/",
    error: "/",
  }
}
