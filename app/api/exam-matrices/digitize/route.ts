import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// POST /api/exam-matrices/digitize - Upload and digitize matrix file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file
    const maxSize = 50 * 1024 * 1024 // 50MB
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/jfif",
    ]

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Chỉ hỗ trợ PDF hoặc ảnh" },
        { status: 400 }
      )
    }

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Kích thước tối đa: 50MB" },
        { status: 400 }
      )
    }

    // Create upload directory if not exists
    const uploadDir = join(process.cwd(), "uploads", "matrices", session.user.id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const fileName = `${Date.now()}-${file.name}`
    const filePath = join(uploadDir, fileName)
    await writeFile(filePath, buffer)

    // Get file URL
    const fileUrl = `/uploads/matrices/${session.user.id}/${fileName}`

    // Create matrix record with "Số hoá" type and "Hàng đợi" status
    const matrix = await prisma.examMatrix.create({
      data: {
        name: `${file.name} (Imported)`,
        grade: "Khối 6", // Default, can be updated after processing
        examType: "Kiểm tra 1 tiết", // Default
        duration: 45,
        totalScore: 10,
        type: "Số hoá",
        status: "Hàng đợi",
        originalFileUrl: fileUrl,
        userId: session.user.id,
      },
    })

    // TODO: Queue OCR/parsing job
    // await queueMatrixProcessing(matrix.id)

    return NextResponse.json({
      success: true,
      matrix: {
        id: matrix.id,
        name: matrix.name,
        status: matrix.status,
      },
      message: "File đã được tải lên. Hệ thống đang xử lý...",
    })
  } catch (error: any) {
    console.error("Digitize error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to digitize matrix" },
      { status: 500 }
    )
  }
}
