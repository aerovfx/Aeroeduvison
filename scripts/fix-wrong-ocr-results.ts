/**
 * Script to fix wrong OCR results in database
 * 
 * This script:
 * 1. Finds documents with suspicious OCR text (simulation text)
 * 2. Clears the wrong OCR text
 * 3. Resets status to "Hàng đợi" so they can be reprocessed
 * 
 * Usage: npx tsx scripts/fix-wrong-ocr-results.ts
 */

import { PrismaClient } from "@prisma/client"
import * as dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

// Simulation text patterns that should not appear in non-history documents
const SIMULATION_PATTERNS = [
  "Cách mạng tháng Tám năm 1945",
  "Đảng Cộng sản Việt Nam",
  "nhân dân cả nước đoàn kết một lòng",
  "tinh thần yêu nước và khát vọng độc lập",
]

async function fixWrongOcrResults() {
  console.log("🔍 Searching for documents with wrong OCR results...\n")

  try {
    // Find all documents with OCR text
    const documents = await prisma.document.findMany({
      where: {
        ocrText: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        type: true,
        status: true,
        ocrText: true,
        metadata: true,
      },
    })

    console.log(`📊 Found ${documents.length} documents with OCR text\n`)

    let fixedCount = 0
    let checkedCount = 0

    for (const doc of documents) {
      checkedCount++
      
      if (!doc.ocrText) continue

      // Check if document name suggests it's NOT a history document
      const isHistoryDocument = 
        doc.name.toLowerCase().includes("lịch sử") ||
        doc.name.toLowerCase().includes("history") ||
        doc.displayName.toLowerCase().includes("lịch sử") ||
        doc.displayName.toLowerCase().includes("history")

      // Check if OCR text contains simulation patterns
      const hasSimulationText = SIMULATION_PATTERNS.some(pattern => 
        doc.ocrText!.includes(pattern)
      )

      if (hasSimulationText && !isHistoryDocument) {
        console.log(`❌ Found wrong OCR result:`)
        console.log(`   Document ID: ${doc.id}`)
        console.log(`   Name: ${doc.name}`)
        console.log(`   Type: ${doc.type}`)
        console.log(`   Status: ${doc.status}`)
        console.log(`   OCR Text Preview: ${doc.ocrText.substring(0, 100)}...`)
        console.log(`   File Hash (if available): ${(doc.metadata as any)?.processedFileHash || "N/A"}`)
        console.log()

        // Clear wrong OCR text and reset status
        await prisma.document.update({
          where: { id: doc.id },
          data: {
            ocrText: null,
            status: "Hàng đợi",
            metadata: {
              ...(doc.metadata as any || {}),
              wrongOcrCleared: true,
              clearedAt: new Date().toISOString(),
              reason: "Detected simulation text in non-history document",
            },
          },
        })

        // Add processing log
        await prisma.documentProcessingLog.create({
          data: {
            documentId: doc.id,
            stage: "error",
            message: "Đã xóa OCR text sai (phát hiện simulation text). Vui lòng số hóa lại.",
            metadata: {
              reason: "simulation_text_detected",
              originalTextPreview: doc.ocrText.substring(0, 200),
            },
          },
        })

        fixedCount++
        console.log(`   ✅ Fixed: Cleared OCR text and reset status to "Hàng đợi"\n`)
      }
    }

    console.log("\n" + "=".repeat(60))
    console.log(`📊 Summary:`)
    console.log(`   Total documents checked: ${checkedCount}`)
    console.log(`   Documents with wrong OCR: ${fixedCount}`)
    console.log(`   Documents fixed: ${fixedCount}`)
    console.log("=".repeat(60))

    if (fixedCount > 0) {
      console.log("\n✅ Fixed documents are now ready to be reprocessed.")
      console.log("   Users can click 'Số hóa với AI' button to reprocess them.")
    } else {
      console.log("\n✅ No wrong OCR results found. All documents look good!")
    }

  } catch (error: any) {
    console.error("❌ Error fixing OCR results:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixWrongOcrResults()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })
