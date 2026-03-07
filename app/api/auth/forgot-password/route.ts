import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { randomBytes } from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await db.user.findUnique({
      where: { email }
    })

    if (!user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json(
        { message: "If an account with that email exists, we've sent a password reset link." },
        { status: 200 }
      )
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 hour

    // Delete any existing reset tokens for this email
    await db.resetToken.deleteMany({
      where: { email }
    })

    // Create new reset token
    await db.resetToken.create({
      data: {
        email,
        token,
        expires
      }
    })

    // TODO: Send email with reset link
    // For now, we'll just return the token in development
    // In production, you should send an email with the reset link
    const resetLink = `${process.env.NEXTAUTH_URL}/reset-password?token=${token}`
    
    console.log(`Password reset link for ${email}: ${resetLink}`)

    return NextResponse.json(
      { 
        message: "If an account with that email exists, we've sent a password reset link.",
        // Remove this in production
        resetLink: process.env.NODE_ENV === 'development' ? resetLink : undefined
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

