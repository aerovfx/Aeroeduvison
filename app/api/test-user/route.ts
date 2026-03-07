import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { compare } from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    
    const user = await db.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return NextResponse.json({ 
        error: "User not found",
        email,
        userExists: false 
      })
    }
    
    if (!user.password) {
      return NextResponse.json({ 
        error: "User has no password",
        email,
        userExists: true,
        hasPassword: false 
      })
    }
    
    const isPasswordValid = await compare(password, user.password)
    
    return NextResponse.json({
      email,
      userExists: true,
      hasPassword: true,
      passwordValid: isPasswordValid,
      userRole: user.role,
      userName: user.name
    })
    
  } catch (error) {
    console.error("Test user error:", error)
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
