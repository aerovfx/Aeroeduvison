/**
 * Script to fix documents with status "Hoàn tất" but no OCR text
 * JavaScript version (no TypeScript compilation needed)
 * 
 * Usage: node scripts/fix-completed-without-ocr.js
 */

const { PrismaClient } = require('@prisma/client')
require('dotenv').config()

const prisma = new PrismaClient()

async function fixCompletedWithoutOcr() {
  console.log("🔍 Searching for documents with status 'Hoàn tất' but no OCR text...\n")

  try {
    // Find all documents with status "Hoàn tất" but no OCR text
    const documents = await prisma.document.findMany({
      where: {
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
          take: 5, // Get last 5 logs
        },
      },
    })

    console.log(`📊 Found ${documents.length} documents with status "Hoàn tất" but no OCR text\n`)

    if (documents.length === 0) {
      console.log("✅ No documents found. All documents are in correct state!")
      return
    }

    let fixedCount = 0
    let errorCount = 0
    let queueCount = 0

    for (const doc of documents) {
      console.log(`\n📄 Document: ${doc.name}`)
      console.log(`   ID: ${doc.id}`)
      console.log(`   Type: ${doc.type}`)
      console.log(`   Status: ${doc.status}`)
      console.log(`   Has OCR Text: ${!!doc.ocrText}`)
      console.log(`   Has Digitized URL: ${!!doc.digitizedUrl}`)
      
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
      let newStatus
      let reason
      
      if (hasErrorLog || hasOcrSkipped) {
        // If there were errors, mark as "Lỗi"
        newStatus = "Lỗi"
        reason = "OCR processing failed or was skipped"
        errorCount++
      } else {
        // Otherwise, reset to queue for retry
        newStatus = "Hàng đợi"
        reason = "No OCR text extracted but no error logged - reset for retry"
        queueCount++
      }

      console.log(`   Processing Logs:`)
      doc.processingLogs.forEach(log => {
        console.log(`     - [${log.stage}] ${log.message} (${new Date(log.createdAt).toLocaleString()})`)
      })
      console.log(`   → New Status: ${newStatus}`)
      console.log(`   → Reason: ${reason}`)

      // Update document
      await prisma.document.update({
        where: { id: doc.id },
        data: {
          status: newStatus,
          processingError: newStatus === "Lỗi" 
            ? "Tài liệu đã được đánh dấu hoàn tất nhưng không có OCR text. Vui lòng số hóa lại."
            : null,
          metadata: {
            ...(doc.metadata || {}),
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

      fixedCount++
      console.log(`   ✅ Fixed`)
    }

    console.log("\n" + "=".repeat(60))
    console.log(`📊 Summary:`)
    console.log(`   Total documents found: ${documents.length}`)
    console.log(`   Documents fixed: ${fixedCount}`)
    console.log(`   → Set to "Lỗi": ${errorCount}`)
    console.log(`   → Set to "Hàng đợi": ${queueCount}`)
    console.log("=".repeat(60))

    if (fixedCount > 0) {
      console.log("\n✅ Fixed documents:")
      console.log(`   - ${errorCount} documents marked as "Lỗi" (need manual review)`)
      console.log(`   - ${queueCount} documents reset to "Hàng đợi" (can be reprocessed)`)
      console.log("\n💡 Next steps:")
      console.log("   - Documents with status 'Hàng đợi' can be reprocessed by clicking 'Số hóa với AI'")
      console.log("   - Documents with status 'Lỗi' may need manual review or OCR service configuration")
    }

  } catch (error) {
    console.error("❌ Error fixing documents:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixCompletedWithoutOcr()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
