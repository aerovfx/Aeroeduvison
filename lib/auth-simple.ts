import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authOptionsSimple: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-for-development",
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Simple hardcoded users for testing
        const users = [
          {
            id: "1",
            email: "teacher@example.com",
            password: "teacher123",
            name: "Math Teacher",
            role: "TEACHER",
          },
          {
            id: "2", 
            email: "student@example.com",
            password: "student123",
            name: "Math Student",
            role: "STUDENT",
          }
        ]

        const user = users.find(u => u.email === credentials.email && u.password === credentials.password)
        
        if (!user) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  }
}
