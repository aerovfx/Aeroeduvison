import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// POST /api/documents/upload - Upload documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      )
    }

    // Validate files
    const maxSize = 50 * 1024 * 1024 // 50MB
    const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `File ${file.name} không được hỗ trợ. Chỉ hỗ trợ PDF, JPG, PNG.` },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} quá lớn. Kích thước tối đa: 50MB.` },
          { status: 400 }
        )
      }
    }

    // Create upload directory if not exists
    const uploadDir = join(process.cwd(), "uploads", "documents", session.user.id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploadedDocuments = []

    for (const file of files) {
      try {
        // Determine file type
        let docType = "VĂN BẢN"
        if (file.type === "application/pdf") {
          docType = "PDF"
        } else if (file.type.startsWith("image/")) {
          docType = "IMAGE"
        }

        // Save file
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`
        const filePath = join(uploadDir, fileName)
        
        try {
          await writeFile(filePath, buffer)
        } catch (fileError: any) {
          console.error(`Failed to write file ${file.name}:`, fileError)
          throw new Error(`Không thể lưu file ${file.name}: ${fileError.message}`)
        }

        // Get file URL (in production, upload to S3/GCS)
        const fileUrl = `/uploads/documents/${session.user.id}/${fileName}`

        // Create document record
        let document
        try {
          document = await prisma.document.create({
            data: {
              name: file.name,
              displayName: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
              type: docType,
              mimeType: file.type,
              fileSize: file.size,
              originalUrl: fileUrl,
              userId: session.user.id,
              status: "Hàng đợi",
              metadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
              },
            },
          })
        } catch (dbError: any) {
          console.error(`Failed to create document record for ${file.name}:`, dbError)
          // If database error, try to clean up the file
          try {
            const fs = require("fs")
            if (existsSync(filePath)) {
              fs.unlinkSync(filePath)
            }
          } catch (cleanupError) {
            console.error("Failed to cleanup file:", cleanupError)
          }
          
          // Check if it's a schema error
          if (dbError.message?.includes("Unknown arg") || dbError.message?.includes("does not exist")) {
            throw new Error("Database schema chưa được cập nhật. Vui lòng chạy: npx prisma db push")
          }
          throw new Error(`Không thể lưu thông tin file ${file.name}: ${dbError.message}`)
        }

        uploadedDocuments.push(document)

        // Auto-process with AI if enabled (can be controlled by frontend)
        // For now, we'll process in background
        // The frontend can call /api/documents/[id]/process to trigger processing
      } catch (fileError: any) {
        console.error(`Error processing file ${file.name}:`, fileError)
        // Continue with other files, but log the error
        throw new Error(`Lỗi khi xử lý file ${file.name}: ${fileError.message}`)
      }
    }

    return NextResponse.json({
      success: true,
      documents: uploadedDocuments,
      message: `Đã tải lên ${uploadedDocuments.length} file thành công`,
    })
  } catch (error: any) {
    console.error("Upload error:", error)
    console.error("Error stack:", error.stack)
    return NextResponse.json(
      { 
        error: error.message || "Failed to upload documents",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
