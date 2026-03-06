import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// POST /api/documents/[id]/save-result - Save final digitized result to file
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const document = await prisma.document.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      )
    }

    if (document.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      )
    }

    // Get the final text to save (prefer restructured text, fallback to OCR text)
    const restructuredText = (document.metadata as any)?.aiAnalysis?.restructuredText
    const ocrText = document.ocrText
    const finalText = restructuredText || ocrText

    if (!finalText || finalText.trim().length === 0) {
      return NextResponse.json(
        { error: "Không có nội dung để lưu. Vui lòng số hóa tài liệu trước." },
        { status: 400 }
      )
    }

    // Get AI analysis metadata for file header
    const aiAnalysis = (document.metadata as any)?.aiAnalysis
    const documentType = aiAnalysis?.type || "document"
    const keyTopics = aiAnalysis?.keyTopics || []
    const summary = aiAnalysis?.summary || ""
    const structure = aiAnalysis?.structure

    // Create result directory
    const resultDir = join(process.cwd(), "uploads", "results", session.user.id)
    if (!existsSync(resultDir)) {
      await mkdir(resultDir, { recursive: true })
    }

    // Generate filename
    const baseName = document.displayName || document.name.replace(/\.[^/.]+$/, "")
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
    const fileName = `${baseName}_${timestamp}.txt`
    const filePath = join(resultDir, fileName)

    // Build file content with metadata header
    let fileContent = ""
    
    // Header with metadata
    fileContent += "=".repeat(80) + "\n"
    fileContent += "KẾT QUẢ SỐ HÓA TÀI LIỆU\n"
    fileContent += "=".repeat(80) + "\n\n"
    
    fileContent += `Tên tài liệu: ${document.displayName || document.name}\n`
    fileContent += `Loại tài liệu: ${getDocumentTypeLabel(documentType)}\n`
    fileContent += `Ngày số hóa: ${new Date(document.processedAt || document.updatedAt).toLocaleString("vi-VN")}\n`
    if (document.executionTime) {
      fileContent += `Thời gian xử lý: ${document.executionTime} giây\n`
    }
    fileContent += "\n"

    // Key topics
    if (keyTopics.length > 0) {
      fileContent += "Chủ đề: " + keyTopics.join(", ") + "\n"
      fileContent += "\n"
    }

    // Summary
    if (summary) {
      fileContent += "Tóm tắt:\n"
      fileContent += summary + "\n"
      fileContent += "\n"
    }

    // Structure (if available)
    if (structure?.sections && structure.sections.length > 0) {
      fileContent += "Cấu trúc tài liệu:\n"
      structure.sections.forEach((section: any, index: number) => {
        fileContent += `${index + 1}. ${section.title}\n`
      })
      fileContent += "\n"
    }

    fileContent += "-".repeat(80) + "\n"
    fileContent += "NỘI DUNG ĐÃ SỐ HÓA\n"
    fileContent += "-".repeat(80) + "\n\n"

    // Main content
    fileContent += finalText

    // Footer
    fileContent += "\n\n" + "=".repeat(80) + "\n"
    fileContent += `Được tạo bởi hệ thống số hóa tài liệu AeroEduVision\n`
    fileContent += `Ngày tạo: ${new Date().toLocaleString("vi-VN")}\n`
    fileContent += "=".repeat(80) + "\n"

    // Save file
    await writeFile(filePath, fileContent, "utf-8")

    // Get file URL
    const fileUrl = `/uploads/results/${session.user.id}/${fileName}`

    // Update document with result file URL
    await prisma.document.update({
      where: { id: params.id },
      data: {
        digitizedUrl: fileUrl,
        metadata: {
          ...(document.metadata as any || {}),
          resultFile: {
            url: fileUrl,
            fileName: fileName,
            savedAt: new Date().toISOString(),
            format: "txt",
            size: Buffer.byteLength(fileContent, "utf-8"),
          },
        },
      },
    })

    console.log("✅ [SAVE-RESULT] Result file saved:", {
      documentId: params.id,
      fileName: fileName,
      fileSize: Buffer.byteLength(fileContent, "utf-8"),
      hasRestructuredText: !!restructuredText,
    })

    return NextResponse.json({
      success: true,
      message: "Đã lưu kết quả số hóa thành công",
      file: {
        url: fileUrl,
        fileName: fileName,
        size: Buffer.byteLength(fileContent, "utf-8"),
        format: "txt",
      },
    })
  } catch (error: any) {
    console.error("Save result error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to save result" },
      { status: 500 }
    )
  }
}

function getDocumentTypeLabel(type: string): string {
  const labels: { [key: string]: string } = {
    exam: "Đề thi",
    textbook: "Sách giáo khoa",
    question_bank: "Ngân hàng câu hỏi",
    document: "Tài liệu",
  }
  return labels[type] || "Tài liệu"
}
