import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { hash, compare } from "bcryptjs"
import { db } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { currentPassword, newPassword } = await request.json()

    console.log("🔐 [CHANGE-PASSWORD] Request from:", session.user.email)

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Thiếu thông tin mật khẩu" },
        { status: 400 }
      )
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "Mật khẩu mới phải có ít nhất 8 ký tự" },
        { status: 400 }
      )
    }

    // Normalize email
    const normalizedEmail = session.user.email.toLowerCase().trim()

    // Get user from database
    const user = await db.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      console.log("❌ [CHANGE-PASSWORD] User not found")
      return NextResponse.json(
        { error: "Người dùng không tồn tại" },
        { status: 404 }
      )
    }

    // Check if user has password (not OAuth-only user)
    if (!user.password) {
      console.log("❌ [CHANGE-PASSWORD] User has no password (OAuth user)")
      return NextResponse.json(
        { error: "Tài khoản này đăng nhập qua Google, không thể đổi mật khẩu" },
        { status: 400 }
      )
    }

    // Verify current password
    const isCurrentPasswordValid = await compare(currentPassword, user.password)
    
    if (!isCurrentPasswordValid) {
      console.log("❌ [CHANGE-PASSWORD] Current password invalid")
      return NextResponse.json(
        { error: "Mật khẩu hiện tại không đúng" },
        { status: 400 }
      )
    }

    console.log("✅ [CHANGE-PASSWORD] Current password verified")

    // Hash new password
    const hashedPassword = await hash(newPassword, 12)
    console.log("✅ [CHANGE-PASSWORD] New password hashed")

    // Update password
    await db.user.update({
      where: { email: normalizedEmail },
      data: { password: hashedPassword }
    })

    console.log("✅ [CHANGE-PASSWORD] Password updated successfully")

    return NextResponse.json(
      { message: "Đổi mật khẩu thành công" },
      { status: 200 }
    )
  } catch (error) {
    console.error("❌ [CHANGE-PASSWORD] Error:", error)
    return NextResponse.json(
      { error: "Lỗi hệ thống. Vui lòng thử lại." },
      { status: 500 }
    )
  }
}
