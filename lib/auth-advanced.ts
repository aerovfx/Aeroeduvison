import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import GitHubProvider from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db"
import { compare, hash } from "bcryptjs"
import { JWT } from "next-auth/jwt"
import { Session } from "next-auth"

// Advanced session configuration
export const SESSION_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  updateAge: 24 * 60 * 60, // 24 hours
  strategy: "jwt" as const,
}

// JWT configuration
export const JWT_CONFIG = {
  maxAge: 7 * 24 * 60 * 60, // 7 days
  secret: process.env.NEXTAUTH_SECRET,
}

// Rate limiting configuration
const RATE_LIMIT = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
}

// Store for rate limiting (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// Rate limiting function
function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(identifier, { count: 1, resetTime: now + RATE_LIMIT.windowMs })
    return true
  }
  
  if (record.count >= RATE_LIMIT.maxAttempts) {
    return false
  }
  
  record.count++
  return true
}

// Advanced user validation
async function validateUser(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim()
  
  // Check rate limiting
  if (!checkRateLimit(normalizedEmail)) {
    throw new Error("Too many login attempts. Please try again later.")
  }
  
  const user = await db.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      role: true,
      password: true,
      emailVerified: true,
      isActive: true,
      lastLoginAt: true,
      loginAttempts: true,
      lockedUntil: true,
    }
  })

  if (!user) {
    throw new Error("Invalid credentials")
  }

  // Check if account is locked
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    throw new Error("Account is temporarily locked due to too many failed attempts")
  }

  // Check if account is active
  if (user.isActive === false) {
    throw new Error("Account is deactivated")
  }

  if (!user.password) {
    throw new Error("Please sign in with your social account")
  }

  const isPasswordValid = await compare(password, user.password)
  
  if (!isPasswordValid) {
    // Increment login attempts
    const attempts = (user.loginAttempts || 0) + 1
    const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null // 30 minutes lock
    
    await db.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: attempts,
        lockedUntil,
      }
    })
    
    throw new Error("Invalid credentials")
  }

  // Reset login attempts on successful login
  await db.user.update({
    where: { id: user.id },
    data: {
      loginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    }
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: user.role,
  }
}

// Advanced OAuth user creation/update
async function handleOAuthUser(user: any, account: any) {
  const normalizedEmail = user.email!.toLowerCase().trim()
  
  const existingUser = await db.user.findUnique({
    where: { email: normalizedEmail }
  })

  if (!existingUser) {
    // Create new user with default role
    const newUser = await db.user.create({
      data: {
        email: normalizedEmail,
        name: user.name!,
        image: user.image,
        role: "STUDENT",
        emailVerified: new Date(),
        isActive: true,
        lastLoginAt: new Date(),
        loginAttempts: 0,
      }
    })
    return newUser
  } else {
    // Update existing user
    const updatedUser = await db.user.update({
      where: { email: normalizedEmail },
      data: {
        name: user.name!,
        image: user.image,
        emailVerified: new Date(),
        lastLoginAt: new Date(),
      }
    })
    return updatedUser
  }
}

// Advanced JWT token with additional claims
async function enhanceJWT(token: JWT, user?: any, account?: any) {
  if (user) {
    token.role = user.role
    token.id = user.id
    token.email = user.email
    token.name = user.name
    token.image = user.image
    token.iat = Math.floor(Date.now() / 1000)
    token.exp = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
  }

  // Refresh user data from database periodically
  if (token.email && Date.now() - (token.lastRefresh || 0) > 60 * 60 * 1000) { // 1 hour
    try {
      const dbUser = await db.user.findUnique({
        where: { email: token.email as string },
        select: { role: true, isActive: true, name: true, image: true }
      })
      
      if (dbUser) {
        token.role = dbUser.role
        token.name = dbUser.name
        token.image = dbUser.image
        token.isActive = dbUser.isActive
        token.lastRefresh = Date.now()
      }
    } catch (error) {
      console.error("Error refreshing user data:", error)
    }
  }

  return token
}

// Advanced session with additional data
async function enhanceSession(session: Session, token: JWT) {
  if (token) {
    session.user.id = token.id as string
    session.user.role = token.role as string
    session.user.email = token.email as string
    session.user.name = token.name as string
    session.user.image = token.image as string
    session.user.isActive = token.isActive as boolean
  }

  // Validate session with database
  if (session?.user?.email) {
    try {
      const dbUser = await db.user.findUnique({
        where: { email: session.user.email },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          name: true, 
          image: true,
          isActive: true,
          lastLoginAt: true,
        }
      })
      
      if (!dbUser || !dbUser.isActive) {
        return null // Invalidate session
      }
      
      // Update session with latest data
      session.user.id = dbUser.id
      session.user.role = dbUser.role
      session.user.name = dbUser.name
      session.user.image = dbUser.image
      session.user.isActive = dbUser.isActive
    } catch (error) {
      console.error("Error validating session:", error)
      return null
    }
  }

  return session
}

// Advanced NextAuth configuration
export const advancedAuthOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
  
  // Use Prisma adapter for database sessions
  // adapter: PrismaAdapter(db), // Commented out to avoid session issues
  
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { 
          label: "Email", 
          type: "email",
          placeholder: "mail@example.com"
        },
        password: { 
          label: "Password", 
          type: "password" 
        }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          const user = await validateUser(credentials.email, credentials.password)
          return user
        } catch (error: any) {
          console.error("Authorization error:", error.message)
          return null
        }
      }
    })
  ],

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day
    updateAge: 60 * 60, // 1 hour
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 1 day
    secret: process.env.NEXTAUTH_SECRET,
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google" || account?.provider === "github") {
          await handleOAuthUser(user, account)
        }
        return true
      } catch (error) {
        console.error("SignIn error:", error)
        return false
      }
    },

    async jwt({ token, user, account, trigger, session }) {
      // Handle session update trigger
      if (trigger === "update" && session) {
        token.name = session.name
        token.image = session.image
      }

      return await enhanceJWT(token, user, account)
    },

    async session({ session, token }) {
      return await enhanceSession(session, token)
    },

    async redirect({ url, baseUrl }) {
      // Handle redirects after sign in
      if (url.startsWith("/")) return `${baseUrl}${url}`
      if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  pages: {
    signIn: "/auth/signin",
    signOut: "/auth/signout",
    error: "/auth/error",
    verifyRequest: "/auth/verify-request",
    newUser: "/auth/new-user"
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      console.log("User signed in:", { 
        userId: user.id, 
        email: user.email, 
        provider: account?.provider,
        isNewUser 
      })
    },
    
    async signOut({ session, token }) {
      console.log("User signed out:", { 
        userId: session?.user?.id || token?.id,
        email: session?.user?.email || token?.email 
      })
    },
    
    async createUser({ user }) {
      console.log("New user created:", { 
        userId: user.id, 
        email: user.email 
      })
    },
    
    async linkAccount({ user, account }) {
      console.log("Account linked:", { 
        userId: user.id, 
        provider: account.provider 
      })
    }
  },

  // Advanced security options
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production"
      }
    }
  }
}

// Utility functions for advanced auth features
export const authUtils = {
  // Check if user has specific role
  hasRole: (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = {
      'ADMIN': 3,
      'TEACHER': 2,
      'STUDENT': 1
    }
    
    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] || 0
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] || 0
    
    return userLevel >= requiredLevel
  },

  // Check if user has any of the specified roles
  hasAnyRole: (userRole: string, roles: string[]): boolean => {
    return roles.includes(userRole)
  },

  // Generate secure session token
  generateSessionToken: (): string => {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  },

  // Check password strength
  checkPasswordStrength: (password: string): { score: number; feedback: string } => {
    let score = 0
    const feedback = []

    if (password.length >= 8) score += 1
    else feedback.push("Use at least 8 characters")

    if (/[a-z]/.test(password)) score += 1
    else feedback.push("Include lowercase letters")

    if (/[A-Z]/.test(password)) score += 1
    else feedback.push("Include uppercase letters")

    if (/[0-9]/.test(password)) score += 1
    else feedback.push("Include numbers")

    if (/[^A-Za-z0-9]/.test(password)) score += 1
    else feedback.push("Include special characters")

    return {
      score,
      feedback: feedback.length > 0 ? feedback.join(", ") : "Strong password"
    }
  }
}

// Export types for TypeScript
export type AuthUser = {
  id: string
  email: string
  name?: string | null
  image?: string | null
  role: string
  isActive?: boolean
}

export type AuthSession = {
  user: AuthUser
  expires: string
}
