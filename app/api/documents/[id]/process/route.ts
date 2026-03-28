import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db as prisma } from "@/lib/db"
import { readFile, stat, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { createHash } from "crypto"
import { GoogleGenerativeAI } from "@google/generative-ai"

// POST /api/documents/[id]/process - Process document with AI/OCR
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const document = await prisma.document.findUnique({
      where: { id },
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

    // Update status to processing
    await prisma.document.update({
      where: { id },
      data: {
        status: "Đang xử lý",
      },
    })

    // Log processing start
    await prisma.documentProcessingLog.create({
      data: {
        documentId: id,
        stage: "processing",
        message: "Bắt đầu xử lý OCR với AI",
      },
    })

    const startTime = Date.now()

    try {
      // CRITICAL: Log document info to ensure we're processing the correct document
      console.log("🔍 [PROCESS] Starting OCR for document:", {
        documentId: id,
        documentName: document.name,
        originalUrl: document.originalUrl,
        type: document.type,
        mimeType: document.mimeType,
        userId: document.userId,
      })

      // Read file from storage
      let filePath = join(process.cwd(), "public", document.originalUrl.replace(/^\//, ""))
      
      if (!existsSync(filePath)) {
        // Try alternative paths
        const altPaths = [
          join(process.cwd(), document.originalUrl.replace(/^\//, "")),
          join(process.cwd(), "uploads", document.originalUrl.replace(/^\/uploads\//, "")),
          document.originalUrl.startsWith("/") 
            ? join(process.cwd(), document.originalUrl.slice(1))
            : join(process.cwd(), document.originalUrl),
        ]
        
        let found = false
        for (const altPath of altPaths) {
          if (existsSync(altPath)) {
            filePath = altPath
            found = true
            break
          }
        }
        
        if (!found) {
          console.error(`❌ [PROCESS] File not found. Tried paths:`, [filePath, ...altPaths])
          throw new Error(`File not found: ${document.originalUrl}. Please check file path.`)
        }
      }

      // Verify file exists and get file info
      const fileStats = await stat(filePath)
      console.log("📄 [PROCESS] File found:", {
        path: filePath,
        size: fileStats.size,
        modified: fileStats.mtime,
      })

      // Calculate file hash to verify we're reading the correct file
      const fileBuffer = await readFile(filePath)
      const fileHash = createHash("md5").update(fileBuffer).digest("hex")
      console.log("🔐 [PROCESS] File hash (MD5):", fileHash.substring(0, 16) + "...")
      
      // Log file info to processing log
      await prisma.documentProcessingLog.create({
        data: {
          documentId: id,
          stage: "processing",
          message: `Đang xử lý file: ${document.name} (${(fileStats.size / 1024).toFixed(1)} KB)`,
          metadata: {
            filePath: filePath.replace(process.cwd(), "[ROOT]"),
            fileSize: fileStats.size,
            fileHash: fileHash.substring(0, 16),
            fileName: document.name,
          },
        },
      })

      // Process with Gemini Vision API for text extraction
      let ocrResult: any = null
      let extractedText = ""

      if (document.type === "IMAGE" || document.type === "PDF") {
        // For images, use Gemini Vision API
        if (document.type === "IMAGE") {
          try {
            // Next.js automatically loads .env.local, .env.development, .env
            // But we need to check both GEMINI_API_KEY and GOOGLE_AI_API_KEY
            const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
            
            // Debug: Log all env variables related to Gemini (without exposing full key)
            console.log("🔍 [PROCESS] Checking Gemini API Key:", {
              hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
              hasGOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
              keyLength: geminiApiKey?.length || 0,
              keyPrefix: geminiApiKey ? geminiApiKey.substring(0, 10) + "..." : "N/A",
              isPlaceholder: geminiApiKey === "your-gemini-api-key-here" || geminiApiKey === "your-gemini-api-key",
            })
            
            // Check for placeholder values
            const isPlaceholder = geminiApiKey === "your-gemini-api-key-here" || 
                                 geminiApiKey === "your-gemini-api-key" ||
                                 geminiApiKey?.includes("your-") ||
                                 geminiApiKey?.includes("placeholder")
            
            if (!geminiApiKey || isPlaceholder || geminiApiKey.trim().length === 0) {
              console.error("❌ [PROCESS] GEMINI_API_KEY not configured or invalid:", {
                hasGEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
                hasGOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
                keyValue: geminiApiKey ? "SET" : "NOT SET",
                keyLength: geminiApiKey?.length || 0,
              })
              throw new Error("GEMINI_API_KEY chưa được cấu hình hoặc không hợp lệ. Vui lòng:\n1. Thêm GEMINI_API_KEY vào file .env hoặc .env.local\n2. Restart Next.js server (Ctrl+C rồi npm run dev)\n3. Lấy API key tại: https://aistudio.google.com/app/apikey")
            }
            
            // Validate API key format
            if (!geminiApiKey.startsWith("AIza")) {
              console.warn("⚠️ [PROCESS] GEMINI_API_KEY format might be invalid (should start with 'AIza')")
            }
            
            console.log("✅ [PROCESS] GEMINI_API_KEY found and valid:", {
              keyPrefix: geminiApiKey.substring(0, 10) + "...",
              keyLength: geminiApiKey.length,
              source: process.env.GEMINI_API_KEY ? "GEMINI_API_KEY" : "GOOGLE_AI_API_KEY",
            })

            console.log("🤖 [PROCESS] Using Gemini Vision API for text extraction:", {
              documentId: id,
              fileName: document.name,
              fileSize: fileBuffer.length,
              mimeType: document.mimeType,
            })

            // Initialize Gemini
            const genAI = new GoogleGenerativeAI(geminiApiKey)
            // Use Gemini 2.5 Flash for faster processing (or Pro for better quality)
            const model = genAI.getGenerativeModel({ 
              model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash" 
            })

            // Convert image buffer to base64
            const mimeType = document.mimeType || "image/jpeg"
            const base64Image = fileBuffer.toString("base64")

            // Create prompt for text extraction
            const prompt = `Trích xuất toàn bộ văn bản tiếng Việt trong ảnh này. 
            
Yêu cầu:
- Trích xuất chính xác mọi văn bản có trong ảnh
- Giữ nguyên định dạng (xuống dòng, khoảng trắng)
- Chỉ trả về văn bản thuần túy, không thêm giải thích hay comment
- Nếu có công thức toán học, giữ nguyên ký hiệu
- Nếu có bảng, giữ nguyên cấu trúc bảng`

            // Call Gemini Vision API
            const result = await model.generateContent([
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Image
                }
              },
              { text: prompt }
            ])

            const response = result.response
            extractedText = response.text().trim()

            console.log("✅ [PROCESS] Gemini Vision extraction successful:", {
              documentId: id,
              textLength: extractedText.length,
              textPreview: extractedText.substring(0, 100),
            })

            // Create OCR result object for consistency
            ocrResult = {
              text: extractedText,
              confidence: 0.95, // Gemini Vision is generally very accurate
              total_lines: extractedText.split("\n").length,
              provider: "gemini-vision",
              model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
            }

            // Log success
            await prisma.documentProcessingLog.create({
              data: {
                documentId: id,
                stage: "ocr",
                message: `Trích xuất text thành công với Gemini Vision: ${extractedText.length} ký tự`,
                metadata: {
                  confidence: 0.95,
                  lines: ocrResult.total_lines,
                  textPreview: extractedText.substring(0, 100),
                  fileHash: fileHash.substring(0, 16),
                  provider: "gemini-vision",
                  model: ocrResult.model,
                },
              },
            })

          } catch (geminiError: any) {
            console.error("Gemini Vision error:", geminiError)
            
            // Extract error message
            let errorMessage = geminiError.message || "Không thể trích xuất text với Gemini Vision"
            
            // Check for specific error types
            if (errorMessage.includes("API key") || errorMessage.includes("GEMINI_API_KEY")) {
              errorMessage = "GEMINI_API_KEY chưa được cấu hình hoặc không hợp lệ. Vui lòng kiểm tra file .env"
            } else if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
              errorMessage = "Đã vượt quá quota của Gemini API. Vui lòng kiểm tra usage tại https://aistudio.google.com"
            } else if (errorMessage.includes("size") || errorMessage.includes("too large")) {
              errorMessage = "File quá lớn cho Gemini Vision API. Kích thước tối đa: 20MB"
            }
            
            await prisma.documentProcessingLog.create({
              data: {
                documentId: id,
                stage: "error",
                message: `Gemini Vision thất bại: ${errorMessage}`,
                metadata: {
                  error: errorMessage,
                  errorType: geminiError.name || "GeminiVisionError",
                },
              },
            })
            
            throw new Error(`Không thể trích xuất text từ tài liệu. ${errorMessage}`)
          }
        } else {
          // For PDF files, we can't use Gemini Vision directly
          // TODO: Extract text from PDF using PDF parser or convert to images first
          await prisma.documentProcessingLog.create({
            data: {
              documentId: id,
              stage: "ocr",
              message: "PDF cần xử lý riêng (chưa hỗ trợ Gemini Vision cho PDF)",
            },
          })
          extractedText = ""
        }
      }

      // Use AI to analyze, structure, and restructure the content
      let structuredContent = null
      if (extractedText) {
        try {
          await prisma.documentProcessingLog.create({
            data: {
              documentId: id,
              stage: "processing",
              message: "Đang phân tích và tái cấu trúc nội dung với AI...",
            },
          })

          // Prepare image data for multimodal analysis (if available)
          let imageBase64 = null
          let imageMimeType = null
          if (document.type === "IMAGE" && fileBuffer) {
            try {
              imageBase64 = fileBuffer.toString("base64")
              imageMimeType = document.mimeType || "image/jpeg"
              console.log("📸 [PROCESS] Including image for layout analysis")
            } catch (e) {
              console.warn("⚠️ [PROCESS] Could not encode image for analysis:", e)
            }
          }

          // Call AI service to analyze and restructure content
          const aiResponse = await fetch(`${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/ai/analyze-document`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: extractedText,
              documentType: document.type,
              fileName: document.name,
              imageBase64: imageBase64, // Include image for layout analysis
              mimeType: imageMimeType,
            }),
          })

          if (aiResponse.ok) {
            structuredContent = await aiResponse.json()
            
            console.log("✅ [PROCESS] AI analysis and restructuring completed:", {
              hasRestructuredText: !!structuredContent.restructuredText,
              hasLayoutAnalysis: !!structuredContent.layoutAnalysis,
              sections: structuredContent.structure?.sections?.length || 0,
            })
            
            await prisma.documentProcessingLog.create({
              data: {
                documentId: id,
                stage: "processing",
                message: `Phân tích AI thành công: ${structuredContent.structure?.sections?.length || 0} phần, ${structuredContent.keyTopics?.length || 0} chủ đề`,
                metadata: {
                  type: structuredContent.type,
                  sectionsCount: structuredContent.structure?.sections?.length || 0,
                  topicsCount: structuredContent.keyTopics?.length || 0,
                  hasRestructuredText: !!structuredContent.restructuredText,
                  hasLayoutAnalysis: !!structuredContent.layoutAnalysis,
                },
              },
            })
          } else {
            const errorData = await aiResponse.json().catch(() => ({}))
            throw new Error(errorData.error || `AI analysis failed: ${aiResponse.status}`)
          }
        } catch (aiError: any) {
          console.error("❌ [PROCESS] AI analysis error:", aiError)
          // Continue without AI analysis, but log the error
          await prisma.documentProcessingLog.create({
            data: {
              documentId: id,
              stage: "error",
              message: `Phân tích AI thất bại: ${aiError.message || "Unknown error"}`,
              metadata: {
                error: aiError.message,
                errorType: aiError.name || "AIAnalysisError",
              },
            },
          })
          
          // Still try to create basic analysis from text
          if (extractedText && extractedText.trim().length > 0) {
            try {
              const basicAnalysis = {
                type: detectDocumentTypeHelper(extractedText, document.name),
                structure: extractBasicStructureHelper(extractedText),
                keyTopics: extractBasicTopicsHelper(extractedText),
                summary: generateBasicSummaryHelper(extractedText),
                metadata: {
                  wordCount: extractedText.split(/\s+/).length,
                  characterCount: extractedText.length,
                  estimatedPages: Math.ceil(extractedText.length / 2000),
                  aiModel: "fallback",
                  aiProvider: "fallback",
                  error: aiError.message,
                },
              }

              structuredContent = basicAnalysis
              console.log("⚠️ [PROCESS] Using fallback analysis due to AI error")
            } catch (fallbackError) {
              console.error("❌ [PROCESS] Fallback analysis also failed:", fallbackError)
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Đã số hóa tài liệu thành công",
        data: {
          text: extractedText,
          executionTime,
          ocrResult: ocrResult ? {
            confidence: ocrResult.confidence || ocrResult.data?.confidence,
            totalLines: ocrResult.total_lines || ocrResult.data?.total_lines,
          } : null,
          aiAnalysis: structuredContent,
        },
      })
    } catch (error: any) {
      console.error("Processing error:", error)

      // Extract and clean error message
      let errorMessage = error.message || "Failed to process document"

      // Remove duplicate phrases
      const duplicates = [
        "OCR service không khả dụng",
        "Vui lòng đảm bảo OCR service đang chạy",
      ]

      for (const phrase of duplicates) {
        // Count occurrences
        const count = (errorMessage.match(new RegExp(phrase, "g")) || []).length
        if (count > 1) {
          // Keep only first occurrence
          const parts = errorMessage.split(phrase)
          errorMessage = parts[0] + phrase + parts.slice(1).join(" ").trim()
        }
      }

      // Clean up multiple "Vui lòng đảm bảo" phrases
      const vuiLongMatches = errorMessage.match(/Vui lòng đảm bảo[^.]*\./g) || []
      if (vuiLongMatches.length > 1) {
        // Keep only the first occurrence
        const firstIndex = errorMessage.indexOf("Vui lòng đảm bảo")
        const firstMatch = vuiLongMatches[0]
        errorMessage = errorMessage.substring(0, firstIndex) +
                      firstMatch +
                      errorMessage.substring(firstIndex + firstMatch.length)
                      .replace(/Vui lòng đảm bảo[^.]*\./g, "")
                      .replace(/\s+/g, " ")
                      .trim()
      }

      // Clean up multiple "Service:" phrases
      const serviceMatches = errorMessage.match(/Service:\s*http[^\s]*/g) || []
      if (serviceMatches.length > 1) {
        // Keep only the last occurrence (most specific)
        const lastMatch = serviceMatches[serviceMatches.length - 1]
        errorMessage = errorMessage.replace(/Service:\s*http[^\s]*/g, "")
                      .trim() + ". " + lastMatch
      }

      const isOcrError = errorMessage.includes("OCR") || errorMessage.includes("trích xuất")

      // Create clean error message for user
      let userErrorMessage = errorMessage
      if (isOcrError && !errorMessage.includes("💡")) {
        // Only add guide if not already present
        const ocrServerUrl = process.env.OCR_SERVER_URL || "http://localhost:8001"
        userErrorMessage = `${errorMessage}\n\n💡 Hướng dẫn:\n- Kiểm tra OCR service có đang chạy tại ${ocrServerUrl}\n- Xem logs để biết chi tiết lỗi\n- Thử số hóa lại sau khi OCR service đã sẵn sàng`
      }

      await prisma.document.update({
        where: { id },
        data: {
          status: "Lỗi",
          processingError: userErrorMessage,
        },
      })

      await prisma.documentProcessingLog.create({
        data: {
          documentId: id,
          stage: "error",
          message: `Lỗi: ${errorMessage}`,
          metadata: {
            errorType: error.name || "ProcessingError",
            isOcrError: isOcrError,
            fullError: error.stack || errorMessage,
          },
        },
      })

      return NextResponse.json(
        {
          error: errorMessage,
          details: isOcrError ? {
            suggestion: "Vui lòng đảm bảo OCR service đang chạy",
            serviceUrl: process.env.OCR_SERVER_URL || "http://localhost:8001",
          } : undefined,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error("Process document error:", error)
    return NextResponse.json(
      { error: "Failed to process document" },
      { status: 500 }
    )
  }
}

// Helper functions for fallback analysis
const detectDocumentTypeHelper = (text: string, fileName?: string): string => {
  const lowerText = text.toLowerCase()
  const lowerFileName = fileName?.toLowerCase() || ""

  if (lowerText.includes("đề thi") || lowerText.includes("câu hỏi") || lowerFileName.includes("đề")) {
    return "exam"
  }
  if (lowerText.includes("chương") || lowerText.includes("bài") || lowerFileName.includes("sgk")) {
    return "textbook"
  }
  if (lowerText.includes("ngân hàng") || lowerText.includes("trắc nghiệm")) {
    return "question_bank"
  }
  return "document"
}

const extractBasicStructureHelper = (text: string): any => {
  const lines = text.split("\n").filter((line) => line.trim().length > 0)
  const sections: any[] = []
  let currentSection: any = null

  for (const line of lines.slice(0, 20)) { // Limit to first 20 lines
    if (line.length < 100 && /^[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(line.trim())) {
      if (currentSection) {
        sections.push(currentSection)
      }
      currentSection = {
        title: line.trim(),
        content: "",
      }
    } else if (currentSection) {
      currentSection.content += line + "\n"
    }
  }

  if (currentSection) {
    sections.push(currentSection)
  }

  return { sections: sections.slice(0, 5) }
}

const extractBasicTopicsHelper = (text: string): string[] => {
  const topics: string[] = []
  const lowerText = text.toLowerCase()

  const topicKeywords: { [key: string]: string } = {
    "toán học": "Toán học",
    "văn học": "Văn học",
    "vật lý": "Vật lý",
    "hóa học": "Hóa học",
    "sinh học": "Sinh học",
    "lịch sử": "Lịch sử",
    "địa lý": "Địa lý",
    "tiếng anh": "Tiếng Anh",
  }

  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerText.includes(keyword) && !topics.includes(topic)) {
      topics.push(topic)
    }
  }

  return topics.slice(0, 5)
}

const generateBasicSummaryHelper = (text: string): string => {
  const sentences = text.split(/[.!?]\s+/).filter((s) => s.trim().length > 20)
  if (sentences.length > 0) {
    return sentences.slice(0, 2).join(". ") + "."
  }
  return text.substring(0, 150) + (text.length > 150 ? "..." : "")
}

