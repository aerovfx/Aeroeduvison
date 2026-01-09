/**
 * Matrix Processing Service
 * Handles OCR extraction and AI analysis for exam matrices
 */

import { db as prisma } from "@/lib/db"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { GeminiService } from "@/lib/ai/services/gemini-service"
import { apiLogger } from "@/lib/logging-simple"

export interface ProcessMatrixOptions {
  matrixId: string
  userId: string
}

export interface ProcessMatrixResult {
  success: boolean
  matrixId: string
  extractedText?: string
  topics?: any[]
  executionTime: number
  error?: string
}

export class MatrixProcessService {
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY = 2000

  /**
   * Process matrix: OCR + AI Analysis
   */
  static async processMatrix(
    options: ProcessMatrixOptions
  ): Promise<ProcessMatrixResult> {
    const startTime = Date.now()
    const { matrixId, userId } = options

    try {
      // Fetch matrix
      const matrix = await prisma.examMatrix.findUnique({
        where: { id: matrixId },
      })

      if (!matrix) {
        throw new Error("Matrix not found")
      }

      if (matrix.userId !== userId) {
        throw new Error("Forbidden")
      }

      // Update status to "Đang xử lý"
      await prisma.examMatrix.update({
        where: { id: matrixId },
        data: { status: "Đang xử lý" },
      })

      // Log processing start
      await this.logProcessing(matrixId, "processing", "Bắt đầu xử lý ma trận")

      // Step 1: OCR - Extract text from image
      const ocrResult = await this.performOCR(matrix)

      // Step 2: AI Analysis - Parse matrix structure
      let topics: any[] = []
      if (ocrResult.extractedText) {
        topics = await this.performAIAnalysis(matrix, ocrResult.extractedText)
      }

      // Step 3: Save topics to database
      if (topics.length > 0) {
        await this.saveTopics(matrixId, topics)
      }

      // Step 4: Update matrix status to "Hoàn tất"
      // Calculate total questions from topics if available, otherwise keep existing
      let totalQuestions = matrix.totalQuestions || 0
      if (topics.length > 0) {
        totalQuestions = topics.reduce((sum, topic) => {
          return sum + (topic.distributions || []).reduce((topicSum: number, dist: any) => {
            return topicSum + (dist.count || 0)
          }, 0)
        }, 0)
      }

      await prisma.examMatrix.update({
        where: { id: matrixId },
        data: {
          status: "Hoàn tất",
          totalQuestions,
          processedAt: new Date(),
          metadata: {
            ...((matrix.metadata as any) || {}),
            extractedText: ocrResult.extractedText,
            extractedAt: new Date().toISOString(),
            topicsCount: topics.length,
          },
        },
      })

      await this.logProcessing(matrixId, "completed", "Xử lý hoàn tất thành công")

      return {
        success: true,
        matrixId,
        extractedText: ocrResult.extractedText,
        topics,
        executionTime: Math.floor((Date.now() - startTime) / 1000),
      }
    } catch (error: any) {
      apiLogger.error("Matrix processing failed", {
        metadata: {
          matrixId,
          userId,
          error: error.message,
          executionTime: Date.now() - startTime,
        },
      })

      // Update status to "Lỗi"
      try {
        await prisma.examMatrix.update({
          where: { id: matrixId },
          data: {
            status: "Lỗi",
            processingError: error.message || "Xử lý thất bại",
          },
        })
        await this.logProcessing(matrixId, "error", error.message || "Xử lý thất bại")
      } catch (updateError) {
        // Ignore update errors
      }

      return {
        success: false,
        matrixId,
        executionTime: Math.floor((Date.now() - startTime) / 1000),
        error: error.message,
      }
    }
  }

  /**
   * Perform OCR extraction
   */
  private static async performOCR(matrix: any): Promise<{
    extractedText: string
    metadata: any
  }> {
    if (!matrix.originalFileUrl) {
      throw new Error("No file URL found")
    }

    // Resolve file path
    const filePath = this.resolveFilePath(matrix.originalFileUrl)
    if (!existsSync(filePath)) {
      throw new Error("File not found")
    }

    // Read file
    const fileBuffer = await readFile(filePath)
    
    // Determine mime type
    const ext = matrix.originalFileUrl.split(".").pop()?.toLowerCase()
    const mimeTypeMap: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      jfif: "image/jpeg",
      pdf: "application/pdf",
    }
    const mimeType = mimeTypeMap[ext || ""] || "image/jpeg"

    // Extract text using Gemini Vision
    const base64Image = fileBuffer.toString("base64")
    
    // Validate Gemini API key before processing
    const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!geminiApiKey || geminiApiKey.trim().length === 0) {
      throw new Error(
        "GEMINI_API_KEY chưa được cấu hình. Vui lòng:\n" +
        "1. Thêm GEMINI_API_KEY vào file .env hoặc .env.local\n" +
        "2. Restart Next.js server\n" +
        "3. Lấy API key tại: https://aistudio.google.com/app/apikey"
      )
    }
    
    // Check for placeholder values
    const isPlaceholder = 
      geminiApiKey === "your-gemini-api-key-here" ||
      geminiApiKey === "your-gemini-api-key" ||
      geminiApiKey.includes("your-") ||
      geminiApiKey.includes("placeholder")
    
    if (isPlaceholder) {
      throw new Error(
        "GEMINI_API_KEY chứa giá trị placeholder. Vui lòng thay thế bằng API key thực tế.\n" +
        "Lấy API key tại: https://aistudio.google.com/app/apikey"
      )
    }
    
    // Validate API key format (should start with AIza)
    if (!geminiApiKey.startsWith("AIza")) {
      apiLogger.warn("Gemini API key format may be invalid", {
        metadata: { keyPrefix: geminiApiKey.substring(0, 10) },
      })
    }
    
    // Check if Gemini is available
    try {
      const isAvailable = await GeminiService.isAvailable()
      if (!isAvailable) {
        throw new Error(
          "Gemini API không khả dụng. Vui lòng kiểm tra:\n" +
          "1. GEMINI_API_KEY có đúng không\n" +
          "2. API key có còn hiệu lực không\n" +
          "3. Có kết nối internet không"
        )
      }
    } catch (checkError: any) {
      apiLogger.error("Gemini availability check failed", {
        metadata: { error: checkError.message },
      })
      throw new Error(
        `Không thể kết nối đến Gemini API: ${checkError.message}\n` +
        "Vui lòng kiểm tra GEMINI_API_KEY và thử lại."
      )
    }
    
    const extractedText = await GeminiService.extractTextFromImage(
      base64Image,
      mimeType,
      "vi"
    )

    await this.logProcessing(matrix.id, "ocr", "Đã trích xuất text từ hình ảnh")

    return {
      extractedText: extractedText.trim(),
      metadata: {
        provider: "gemini-vision",
        mimeType,
        textLength: extractedText.length,
      },
    }
  }

  /**
   * Perform AI analysis to parse matrix structure
   */
  private static async performAIAnalysis(
    matrix: any,
    extractedText: string
  ): Promise<any[]> {
    const prompt = `Bạn là một AI chuyên phân tích ma trận đề thi. Hãy phân tích text sau và trả về cấu trúc ma trận dưới dạng JSON.

### Text từ ma trận:
${extractedText.substring(0, 10000)}${extractedText.length > 10000 ? "\n...(còn tiếp)" : ""}

### Yêu cầu:
Phân tích và trả về JSON với format:
{
  "topics": [
    {
      "order": 1,
      "topic": "Tên chủ đề (ví dụ: NĂNG LƯỢNG HOÁ HỌC)",
      "content": "Nội dung/Đơn vị kiến thức",
      "distributions": [
        {
          "questionType": "TNKQ_Nhiều_lựa_chọn",
          "cognitiveLevel": "Biết",
          "count": 1
        },
        {
          "questionType": "TNKQ_Nhiều_lựa_chọn",
          "cognitiveLevel": "Hiểu",
          "count": 1
        },
        {
          "questionType": "TNKQ_Đúng_Sai",
          "cognitiveLevel": "Biết",
          "count": 0
        },
        {
          "questionType": "TNKQ_Trả_lời_ngắn",
          "cognitiveLevel": "Biết",
          "count": 0
        },
        {
          "questionType": "Tự_luận",
          "cognitiveLevel": "Biết",
          "count": 0
        }
      ]
    }
  ]
}

### Lưu ý:
- Phân tích chính xác số lượng câu hỏi cho mỗi loại (Nhiều lựa chọn, Đúng/Sai, Trả lời ngắn, Tự luận)
- Phân tích mức độ đánh giá (Biết, Hiểu, Vận dụng)
- Chỉ trả về JSON, không có markdown hay giải thích
- Nếu không tìm thấy thông tin, trả về mảng rỗng`

    try {
      // Check if Gemini is available
      try {
        const isAvailable = await GeminiService.isAvailable()
        if (!isAvailable) {
          apiLogger.warn("Gemini not available for analysis, skipping", {
            metadata: { matrixId: matrix.id },
          })
          return []
        }
      } catch (checkError) {
        // If check fails, try anyway
        apiLogger.warn("Gemini availability check failed, trying anyway", {
          metadata: { matrixId: matrix.id },
        })
      }
      
      const analysis = await GeminiService.generateJSON<{ topics: any[] }>(prompt, {
        systemPrompt: "You are an expert at analyzing exam matrices. Always return valid JSON.",
        temperature: 0.3,
      })

      await this.logProcessing(matrix.id, "analysis", "Đã phân tích cấu trúc ma trận")

      return analysis.topics || []
    } catch (error: any) {
      apiLogger.warn("AI analysis failed, using fallback", {
        metadata: { matrixId: matrix.id, error: error.message },
      })
      // Return empty array if analysis fails - matrix can still be completed without topics
      return []
    }
  }

  /**
   * Save topics to database
   */
  private static async saveTopics(matrixId: string, topics: any[]): Promise<void> {
    // Delete existing topics
    await prisma.matrixTopic.deleteMany({
      where: { matrixId },
    })

    // Create new topics with distributions
    for (const topicData of topics) {
      const topic = await prisma.matrixTopic.create({
        data: {
          matrixId,
          order: topicData.order || 0,
          topic: topicData.topic || "",
          content: topicData.content || "",
          distributions: {
            create: (topicData.distributions || []).map((dist: any) => ({
              questionType: dist.questionType,
              cognitiveLevel: dist.cognitiveLevel,
              count: dist.count || 0,
            })),
          },
        },
      })

      // Calculate percentage score
      const totalQuestions = topic.distributions.reduce(
        (sum, d) => sum + d.count,
        0
      )
      const matrix = await prisma.examMatrix.findUnique({
        where: { id: matrixId },
      })
      const matrixTotalQuestions = matrix?.totalQuestions || 1
      const percentageScore = (totalQuestions / matrixTotalQuestions) * 100

      await prisma.matrixTopic.update({
        where: { id: topic.id },
        data: { percentageScore },
      })
    }
  }

  /**
   * Log processing step
   */
  private static async logProcessing(
    matrixId: string,
    stage: string,
    message: string
  ): Promise<void> {
    try {
      await prisma.matrixProcessingLog.create({
        data: {
          matrixId,
          stage,
          message,
        },
      })
    } catch (error) {
      // Ignore logging errors
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
}
