/**
 * Document Digitization Process Service
 * 
 * Handles the complete document digitization workflow with:
 * - Retry mechanism
 * - Error handling
 * - Structured logging
 * - Queue integration
 * - Caching
 */

import { db as prisma } from "@/lib/db"
import { readFile, stat, writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { createHash } from "crypto"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ErrorRecovery } from "@/lib/errors"
import { apiLogger } from "@/lib/logging-simple"
import { getRedisClient } from "@/lib/redis"
import { getBullMQManager } from "@/lib/queue/bullmq"

export interface ProcessDocumentOptions {
  documentId: string
  userId: string
  skipQueue?: boolean // For immediate processing
}

export interface ProcessResult {
  success: boolean
  documentId: string
  ocrText?: string
  aiAnalysis?: any
  resultFileUrl?: string
  executionTime: number
  error?: string
}

export class DocumentProcessService {
  private static readonly CACHE_TTL = 3600 // 1 hour
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 2000 // 2 seconds

  /**
   * Process document with retry and error handling
   */
  static async processDocument(options: ProcessDocumentOptions): Promise<ProcessResult> {
    const startTime = Date.now()
    const { documentId, userId, skipQueue = false } = options

    try {
      // Check cache first
      const cached = await this.getCachedResult(documentId)
      if (cached) {
        apiLogger.info("Using cached result", {
          metadata: { documentId, cached: true },
        })
        return cached
      }

      // If queue is enabled and not skipping, add to queue
      if (!skipQueue && process.env.ENABLE_DOCUMENT_QUEUE === "true") {
        return await this.queueProcessing(options)
      }

      // Process immediately
      return await ErrorRecovery.withRetry(
        () => this.executeProcessing(options),
        this.MAX_RETRIES,
        this.RETRY_DELAY,
        { documentId, userId }
      )
    } catch (error: any) {
      apiLogger.error("Document processing failed", {
        metadata: {
          documentId,
          userId,
          error: error.message,
          executionTime: Date.now() - startTime,
        },
      })

      return {
        success: false,
        documentId,
        executionTime: Date.now() - startTime,
        error: error.message,
      }
    }
  }

  /**
   * Queue document processing
   */
  private static async queueProcessing(
    options: ProcessDocumentOptions
  ): Promise<ProcessResult> {
    const bullMQ = getBullMQManager()
    const jobId = await bullMQ.addJob(
      "document-processing",
      "process-document",
      options,
      {
        attempts: this.MAX_RETRIES,
        backoff: {
          type: "exponential",
          delay: this.RETRY_DELAY,
        },
      }
    )

    apiLogger.info("Document processing queued", {
      metadata: {
        documentId: options.documentId,
        jobId,
      },
    })

    // Return job ID for tracking
    return {
      success: true,
      documentId: options.documentId,
      executionTime: 0,
    }
  }

  /**
   * Execute document processing
   */
  private static async executeProcessing(
    options: ProcessDocumentOptions
  ): Promise<ProcessResult> {
    const startTime = Date.now()
    const { documentId, userId } = options

    // Fetch document
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    })

    if (!document) {
      throw new Error("Document not found")
    }

    if (document.userId !== userId) {
      throw new Error("Forbidden")
    }

    // Update status
    await prisma.document.update({
      where: { id: documentId },
      data: { status: "Đang xử lý" },
    })

    // Step 1: OCR - Extract text
    const ocrResult = await this.performOCR(document)
    
    // Step 2: AI Analysis
    const aiAnalysis = ocrResult.extractedText
      ? await this.performAIAnalysis(document, ocrResult.extractedText)
      : null

    // Step 3: Save result file
    const resultFileUrl = ocrResult.extractedText
      ? await this.saveResultFile(document, ocrResult.extractedText, aiAnalysis)
      : null

    // Step 4: Update document
    const finalStatus = ocrResult.extractedText ? "Hoàn tất" : "Lỗi"
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: finalStatus,
        ocrText: ocrResult.extractedText || null,
        digitizedUrl: resultFileUrl,
        executionTime: Math.floor((Date.now() - startTime) / 1000),
        processedAt: new Date(),
        processingError: finalStatus === "Lỗi" ? "Không thể trích xuất text" : null,
        metadata: {
          ...(document.metadata as any || {}),
          ocrResult: ocrResult.metadata,
          aiAnalysis: aiAnalysis,
          resultFile: resultFileUrl ? {
            url: resultFileUrl,
            savedAt: new Date().toISOString(),
            format: "txt",
          } : null,
        },
      },
    })

    // Cache result
    const result: ProcessResult = {
      success: true,
      documentId,
      ocrText: ocrResult.extractedText,
      aiAnalysis,
      resultFileUrl,
      executionTime: Math.floor((Date.now() - startTime) / 1000),
    }

    await this.cacheResult(documentId, result)

    return result
  }

  /**
   * Perform OCR extraction
   */
  private static async performOCR(document: any): Promise<{
    extractedText: string
    metadata: any
  }> {
    // Read file
    const filePath = this.resolveFilePath(document.originalUrl)
    const fileBuffer = await readFile(filePath)
    const fileHash = createHash("md5").update(fileBuffer).digest("hex")

    let extractedText = ""

    if (document.type === "IMAGE") {
      // Use Gemini Vision API
      extractedText = await ErrorRecovery.withRetry(
        () => this.extractTextWithGeminiVision(fileBuffer, document.mimeType),
        this.MAX_RETRIES,
        this.RETRY_DELAY,
        { documentId: document.id, type: "ocr" }
      )
    }

    return {
      extractedText,
      metadata: {
        provider: "gemini-vision",
        fileHash: fileHash.substring(0, 16),
        textLength: extractedText.length,
      },
    }
  }

  /**
   * Extract text using Gemini Vision
   */
  private static async extractTextWithGeminiVision(
    fileBuffer: Buffer,
    mimeType?: string
  ): Promise<string> {
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY

    if (!geminiApiKey || geminiApiKey.includes("your-")) {
      throw new Error("GEMINI_API_KEY chưa được cấu hình")
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_VISION_MODEL || "gemini-2.5-flash",
    })

    const base64Image = fileBuffer.toString("base64")
    const prompt = `Trích xuất toàn bộ văn bản tiếng Việt trong ảnh này. 
Yêu cầu:
- Trích xuất chính xác mọi văn bản có trong ảnh
- Giữ nguyên định dạng (xuống dòng, khoảng trắng)
- Chỉ trả về văn bản thuần túy, không thêm giải thích hay comment`

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: base64Image,
        },
      },
      { text: prompt },
    ])

    return result.response.text().trim()
  }

  /**
   * Perform AI analysis
   */
  private static async performAIAnalysis(
    document: any,
    extractedText: string
  ): Promise<any> {
    try {
      const aiResponse = await fetch(
        `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/ai/analyze-document`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: extractedText,
            documentType: document.type,
            fileName: document.name,
            imageBase64: document.type === "IMAGE" ? await this.getImageBase64(document) : null,
            mimeType: document.mimeType,
          }),
        }
      )

      if (aiResponse.ok) {
        return await aiResponse.json()
      }
    } catch (error: any) {
      apiLogger.warn("AI analysis failed", {
        metadata: { documentId: document.id, error: error.message },
      })
    }

    return null
  }

  /**
   * Save result file
   */
  private static async saveResultFile(
    document: any,
    text: string,
    aiAnalysis?: any
  ): Promise<string | null> {
    try {
      const resultDir = join(process.cwd(), "uploads", "results", document.userId)
      if (!existsSync(resultDir)) {
        await mkdir(resultDir, { recursive: true })
      }

      const baseName = document.displayName || document.name.replace(/\.[^/.]+$/, "")
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)
      const fileName = `${baseName}_${timestamp}.txt`
      const filePath = join(resultDir, fileName)

      const finalText = aiAnalysis?.restructuredText || text

      let fileContent = ""
      fileContent += "=".repeat(80) + "\n"
      fileContent += "KẾT QUẢ SỐ HÓA TÀI LIỆU\n"
      fileContent += "=".repeat(80) + "\n\n"
      fileContent += `Tên tài liệu: ${document.displayName || document.name}\n`
      if (aiAnalysis?.type) {
        const typeLabels: { [key: string]: string } = {
          exam: "Đề thi",
          textbook: "Sách giáo khoa",
          question_bank: "Ngân hàng câu hỏi",
          document: "Tài liệu",
        }
        fileContent += `Loại tài liệu: ${typeLabels[aiAnalysis.type] || "Tài liệu"}\n`
      }
      fileContent += `Ngày số hóa: ${new Date().toLocaleString("vi-VN")}\n`
      fileContent += "\n"

      if (aiAnalysis?.keyTopics?.length > 0) {
        fileContent += "Chủ đề: " + aiAnalysis.keyTopics.join(", ") + "\n"
        fileContent += "\n"
      }

      if (aiAnalysis?.summary) {
        fileContent += "Tóm tắt:\n"
        fileContent += aiAnalysis.summary + "\n"
        fileContent += "\n"
      }

      fileContent += "-".repeat(80) + "\n"
      fileContent += "NỘI DUNG ĐÃ SỐ HÓA\n"
      fileContent += "-".repeat(80) + "\n\n"
      fileContent += finalText
      fileContent += "\n\n" + "=".repeat(80) + "\n"
      fileContent += `Được tạo bởi hệ thống số hóa tài liệu AeroEduVision\n`
      fileContent += "=".repeat(80) + "\n"

      await writeFile(filePath, fileContent, "utf-8")

      return `/uploads/results/${document.userId}/${fileName}`
    } catch (error: any) {
      apiLogger.warn("Failed to save result file", {
        metadata: { documentId: document.id, error: error.message },
      })
      return null
    }
  }

  /**
   * Resolve file path
   */
  private static resolveFilePath(originalUrl: string): string {
    let filePath = join(process.cwd(), "public", originalUrl.replace(/^\//, ""))

    if (!existsSync(filePath)) {
      const altPaths = [
        join(process.cwd(), originalUrl.replace(/^\//, "")),
        join(process.cwd(), "uploads", originalUrl.replace(/^\/uploads\//, "")),
      ]

      for (const altPath of altPaths) {
        if (existsSync(altPath)) {
          return altPath
        }
      }
    }

    return filePath
  }

  /**
   * Get image base64
   */
  private static async getImageBase64(document: any): Promise<string | null> {
    try {
      const filePath = this.resolveFilePath(document.originalUrl)
      const fileBuffer = await readFile(filePath)
      return fileBuffer.toString("base64")
    } catch {
      return null
    }
  }

  /**
   * Cache result
   */
  private static async cacheResult(
    documentId: string,
    result: ProcessResult
  ): Promise<void> {
    const redis = getRedisClient()
    if (redis) {
      try {
        await redis.setex(
          `document:result:${documentId}`,
          this.CACHE_TTL,
          JSON.stringify(result)
        )
      } catch (error) {
        apiLogger.warn("Failed to cache result", {
          metadata: { documentId, error: (error as Error).message },
        })
      }
    }
  }

  /**
   * Get cached result
   */
  private static async getCachedResult(
    documentId: string
  ): Promise<ProcessResult | null> {
    const redis = getRedisClient()
    if (redis) {
      try {
        const cached = await redis.get(`document:result:${documentId}`)
        if (cached) {
          return JSON.parse(cached)
        }
      } catch (error) {
        // Ignore cache errors
      }
    }
    return null
  }
}
