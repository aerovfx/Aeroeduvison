import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"

// POST /api/documents/fix-status - Fix documents with invalid status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin (optional - can be removed if all teachers can use)
    // For now, allow all authenticated users

    const body = await request.json().catch(() => ({}))
    const { documentId, fixAll } = body

    let fixedCount = 0
    let errorCount = 0
    let queueCount = 0
    const fixedDocuments: any[] = []

    if (fixAll) {
      // Fix all documents with status "Hoàn tất" but no OCR text
      const documents = await prisma.document.findMany({
        where: {
          userId: session.user.id, // Only user's own documents
          status: "Hoàn tất",
          OR: [
            { ocrText: null },
            { ocrText: "" },
          ],
        },
        select: {
          id: true,
          name: true,
          displayName: true,
          type: true,
          status: true,
          ocrText: true,
          digitizedUrl: true,
          processingError: true,
          metadata: true,
          processingLogs: {
            select: {
              stage: true,
              message: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      })

      for (const doc of documents) {
        // Check processing logs to determine if it was an error or just needs retry
        const hasErrorLog = doc.processingLogs.some(log => 
          log.stage === "error" || 
          log.message?.toLowerCase().includes("error") ||
          log.message?.toLowerCase().includes("không khả dụng") ||
          log.message?.toLowerCase().includes("failed")
        )
        
        const hasOcrSkipped = doc.processingLogs.some(log =>
          log.message?.toLowerCase().includes("skipped") ||
          log.message?.toLowerCase().includes("bỏ qua")
        )

        // Determine new status
        let newStatus: string
        let reason: string
        
        if (hasErrorLog || hasOcrSkipped) {
          newStatus = "Lỗi"
          reason = "OCR processing failed or was skipped"
          errorCount++
        } else {
          newStatus = "Hàng đợi"
          reason = "No OCR text extracted but no error logged - reset for retry"
          queueCount++
        }

        // Update document
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            status: newStatus,
            processingError: newStatus === "Lỗi" 
              ? "Tài liệu đã được đánh dấu hoàn tất nhưng không có OCR text. Vui lòng số hóa lại."
              : null,
            metadata: {
              ...(doc.metadata as any || {}),
              fixedByScript: true,
              fixedAt: new Date().toISOString(),
              fixReason: reason,
              originalStatus: "Hoàn tất",
            },
          },
        })

        // Add processing log
        await prisma.documentProcessingLog.create({
          data: {
            documentId: doc.id,
            stage: newStatus === "Lỗi" ? "error" : "processing",
            message: `Đã sửa: Status "Hoàn tất" nhưng không có OCR text. Reset về "${newStatus}". ${reason}`,
            metadata: {
              fixedByScript: true,
              originalStatus: "Hoàn tất",
              newStatus: newStatus,
              reason: reason,
            },
          },
        })

        fixedDocuments.push({
          id: doc.id,
          name: doc.name,
          oldStatus: "Hoàn tất",
          newStatus: newStatus,
          reason: reason,
        })

        fixedCount++
      }
    } else if (documentId) {
      // Fix specific document
      const doc = await prisma.document.findUnique({
        where: { id: documentId },
        select: {
          id: true,
          name: true,
          userId: true,
          status: true,
          ocrText: true,
          digitizedUrl: true,
          processingLogs: {
            select: {
              stage: true,
              message: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
      })

      if (!doc) {
        return NextResponse.json(
          { error: "Document not found" },
          { status: 404 }
        )
      }

      if (doc.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Forbidden" },
          { status: 403 }
        )
      }

      if (doc.status !== "Hoàn tất" || (doc.ocrText && doc.ocrText.trim().length > 0)) {
        return NextResponse.json({
          success: true,
          message: "Document is already in correct state",
          document: {
            id: doc.id,
            status: doc.status,
            hasOcrText: !!doc.ocrText,
          },
        })
      }

      // Check processing logs
      const hasErrorLog = doc.processingLogs.some(log => 
        log.stage === "error" || 
        log.message?.toLowerCase().includes("error") ||
        log.message?.toLowerCase().includes("không khả dụng") ||
        log.message?.toLowerCase().includes("failed")
      )
      
      const hasOcrSkipped = doc.processingLogs.some(log =>
        log.message?.toLowerCase().includes("skipped") ||
        log.message?.toLowerCase().includes("bỏ qua")
      )

      let newStatus: string
      let reason: string
      
      if (hasErrorLog || hasOcrSkipped) {
        newStatus = "Lỗi"
        reason = "OCR processing failed or was skipped"
        errorCount++
      } else {
        newStatus = "Hàng đợi"
        reason = "No OCR text extracted but no error logged - reset for retry"
        queueCount++
      }

      // Update document
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: newStatus,
          processingError: newStatus === "Lỗi" 
            ? "Tài liệu đã được đánh dấu hoàn tất nhưng không có OCR text. Vui lòng số hóa lại."
            : null,
          metadata: {
            fixedByScript: true,
            fixedAt: new Date().toISOString(),
            fixReason: reason,
            originalStatus: "Hoàn tất",
          },
        },
      })

      // Add processing log
      await prisma.documentProcessingLog.create({
        data: {
          documentId: doc.id,
          stage: newStatus === "Lỗi" ? "error" : "processing",
          message: `Đã sửa: Status "Hoàn tất" nhưng không có OCR text. Reset về "${newStatus}". ${reason}`,
          metadata: {
            fixedByScript: true,
            originalStatus: "Hoàn tất",
            newStatus: newStatus,
            reason: reason,
          },
        },
      })

      fixedDocuments.push({
        id: doc.id,
        name: doc.name,
        oldStatus: "Hoàn tất",
        newStatus: newStatus,
        reason: reason,
      })

      fixedCount = 1
    } else {
      return NextResponse.json(
        { error: "Either documentId or fixAll must be provided" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} document(s)`,
      fixedCount,
      errorCount,
      queueCount,
      documents: fixedDocuments,
    })
  } catch (error: any) {
    console.error("Fix status error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fix document status" },
      { status: 500 }
    )
  }
}
