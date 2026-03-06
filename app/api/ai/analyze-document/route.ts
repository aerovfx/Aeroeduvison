import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { GeminiService } from "@/lib/ai/services/gemini-service"

// POST /api/ai/analyze-document - Analyze document content with AI
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { text, documentType, fileName, imageBase64, mimeType } = body

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Text content is required" },
        { status: 400 }
      )
    }

    // Use AI to analyze and structure the document
    try {
      // Try using GeminiService first
      const isGeminiAvailable = await GeminiService.isAvailable()
      
      if (isGeminiAvailable) {
        console.log("🤖 [ANALYZE] Using GeminiService for document analysis")
        
        // Build prompt for analysis and restructuring
        const prompt = `Bạn là một AI chuyên phân tích và tái cấu trúc tài liệu giáo dục. Hãy phân tích tài liệu sau và trả về kết quả dưới dạng JSON.

### Tài liệu cần phân tích:
${text.substring(0, 8000)}${text.length > 8000 ? "\n...(còn tiếp)" : ""}

### Yêu cầu phân tích và tái cấu trúc:
1. **Loại tài liệu** (type): Xác định loại tài liệu (exam, textbook, question_bank, document)
2. **Cấu trúc** (structure): Phân tích cấu trúc tài liệu, các phần/chương/bài với layout và vị trí
3. **Chủ đề chính** (keyTopics): Liệt kê 3-5 chủ đề/chủ điểm chính
4. **Tóm tắt** (summary): Tóm tắt nội dung chính trong 2-3 câu
5. **Văn bản tái cấu trúc** (restructuredText): Tái cấu trúc văn bản với:
   - Định dạng rõ ràng (headings, paragraphs, lists)
   - Tổ chức logic (theo chủ đề, phần)
   - Giữ nguyên nội dung nhưng cải thiện cấu trúc
6. **Phân tích layout** (layoutAnalysis): Phân tích bố cục (nếu có hình ảnh):
   - Vị trí các phần (header, body, footer, sidebar)
   - Các khối nội dung (text, images, tables, formulas)
   - Mối quan hệ giữa các phần

### Trả về JSON với format:
{
  "type": "exam|textbook|question_bank|document",
  "structure": {
    "sections": [
      {
        "title": "Tên phần/chương",
        "content": "Nội dung tóm tắt",
        "order": 1,
        "level": 1
      }
    ],
    "layout": {
      "hasHeader": true,
      "hasFooter": false,
      "columns": 1,
      "hasImages": true,
      "hasTables": false
    }
  },
  "keyTopics": ["Chủ đề 1", "Chủ đề 2", ...],
  "summary": "Tóm tắt ngắn gọn nội dung chính",
  "restructuredText": "Văn bản đã được tái cấu trúc với định dạng rõ ràng...",
  "layoutAnalysis": {
    "regions": [
      {
        "type": "text|image|table|formula",
        "position": "top|middle|bottom|left|right",
        "content": "Mô tả nội dung"
      }
    ]
  }
}

Lưu ý:
- Phân tích chính xác, tập trung vào nội dung giáo dục
- Tái cấu trúc văn bản để dễ đọc và tổ chức tốt hơn
- Giữ nguyên nội dung gốc, chỉ cải thiện format và cấu trúc
- Chủ đề phải liên quan đến giáo dục (Toán, Văn, Lý, Hóa, Sinh, Sử, Địa, Anh, etc.)`

        // If image is provided, use multimodal analysis
        let aiAnalysis: any = null
        
        try {
          if (imageBase64 && mimeType) {
            // Use vision API for image + text analysis
            const fullPrompt = `Phân tích cả hình ảnh và văn bản để tái cấu trúc tài liệu. ${prompt}`
            const analysisText = await GeminiService.analyzeImage(
              imageBase64,
              fullPrompt,
              mimeType,
              { temperature: 0.4, maxTokens: 8000 }
            )
            aiAnalysis = await GeminiService.generateJSON<any>(analysisText, {
              temperature: 0.3,
            })
          } else {
            // Text-only analysis
            aiAnalysis = await GeminiService.generateJSON<any>(prompt, {
              systemPrompt: "You are an expert document analyzer. Always return valid JSON.",
              temperature: 0.4,
            })
          }
        } catch (parseError: any) {
          console.warn("Failed to parse Gemini JSON response, using fallback:", parseError)
          aiAnalysis = null
        }

        if (aiAnalysis) {
          console.log("✅ [ANALYZE] GeminiService analysis successful")
          
          return NextResponse.json({
            type: aiAnalysis.type || detectDocumentType(text, fileName),
            structure: aiAnalysis.structure || extractStructure(text),
            keyTopics: aiAnalysis.keyTopics || extractTopics(text),
            summary: aiAnalysis.summary || generateSummary(text),
            restructuredText: aiAnalysis.restructuredText || text,
            layoutAnalysis: aiAnalysis.layoutAnalysis || null,
            metadata: {
              wordCount: text.split(/\s+/).length,
              characterCount: text.length,
              estimatedPages: Math.ceil(text.length / 2000),
              aiModel: "gemini-2.0-flash-exp",
              aiProvider: "gemini-service",
              hasRestructuredText: !!aiAnalysis.restructuredText,
              hasLayoutAnalysis: !!aiAnalysis.layoutAnalysis,
            },
          })
        }
      }
      
      // Fallback to direct Gemini API if service fails
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
      if (geminiApiKey) {
        console.log("🤖 [ANALYZE] Using direct Gemini API (fallback)")
        
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        const model = genAI.getGenerativeModel({ 
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash" 
        })

        const fallbackPrompt = `Bạn là một AI chuyên phân tích và tái cấu trúc tài liệu giáo dục. Hãy phân tích tài liệu sau và trả về kết quả dưới dạng JSON.

### Tài liệu cần phân tích:
${text.substring(0, 8000)}${text.length > 8000 ? "\n...(còn tiếp)" : ""}

### Yêu cầu phân tích và tái cấu trúc:
1. **Loại tài liệu** (type): Xác định loại tài liệu (exam, textbook, question_bank, document)
2. **Cấu trúc** (structure): Phân tích cấu trúc tài liệu
3. **Chủ đề chính** (keyTopics): Liệt kê 3-5 chủ đề/chủ điểm chính
4. **Tóm tắt** (summary): Tóm tắt nội dung chính trong 2-3 câu
5. **Văn bản tái cấu trúc** (restructuredText): Tái cấu trúc văn bản với định dạng rõ ràng
6. **Phân tích layout** (layoutAnalysis): Phân tích bố cục (nếu có hình ảnh)

Trả về JSON hợp lệ.`

        const contents: any[] = []
        if (imageBase64 && mimeType) {
          contents.push({
            inlineData: { mimeType, data: imageBase64 }
          })
        }
        contents.push({ text: fallbackPrompt })

        const result = await model.generateContent(contents)
        const aiText = result.response.text()

        try {
          const jsonMatch = aiText.match(/```json\s*([\s\S]*?)\s*```/) || 
                           aiText.match(/```\s*([\s\S]*?)\s*```/) ||
                           aiText.match(/\{[\s\S]*\}/)
          
          if (jsonMatch) {
            const aiAnalysis = JSON.parse(jsonMatch[1] || jsonMatch[0])
            
            return NextResponse.json({
              type: aiAnalysis.type || detectDocumentType(text, fileName),
              structure: aiAnalysis.structure || extractStructure(text),
              keyTopics: aiAnalysis.keyTopics || extractTopics(text),
              summary: aiAnalysis.summary || generateSummary(text),
              restructuredText: aiAnalysis.restructuredText || text,
              layoutAnalysis: aiAnalysis.layoutAnalysis || null,
              metadata: {
                wordCount: text.split(/\s+/).length,
                characterCount: text.length,
                estimatedPages: Math.ceil(text.length / 2000),
                aiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
                aiProvider: "gemini-direct",
                hasRestructuredText: !!aiAnalysis.restructuredText,
                hasLayoutAnalysis: !!aiAnalysis.layoutAnalysis,
              },
            })
          }
        } catch (parseError) {
          console.warn("Failed to parse fallback Gemini response:", parseError)
        }
      }

      // Fallback to basic analysis if Gemini is not available or failed
      console.log("⚠️ [ANALYZE] Using fallback analysis (Gemini not available or failed)")
      
      const analysis = {
        type: detectDocumentType(text, fileName),
        structure: extractStructure(text),
        keyTopics: extractTopics(text),
        summary: generateSummary(text),
        metadata: {
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
          estimatedPages: Math.ceil(text.length / 2000),
          aiModel: "fallback",
          aiProvider: "fallback",
        },
      }

      return NextResponse.json(analysis)
    } catch (aiError: any) {
      console.error("AI analysis error:", aiError)
      
      // Return basic analysis if AI fails
      return NextResponse.json({
        type: detectDocumentType(text, fileName),
        structure: extractStructure(text),
        keyTopics: extractTopics(text),
        summary: generateSummary(text),
        metadata: {
          wordCount: text.split(/\s+/).length,
          characterCount: text.length,
          estimatedPages: Math.ceil(text.length / 2000),
          aiModel: "fallback",
          aiProvider: "fallback",
          error: aiError.message,
        },
      })
    }
  } catch (error: any) {
    console.error("Analyze document error:", error)
    return NextResponse.json(
      { error: "Failed to analyze document" },
      { status: 500 }
    )
  }
}

// Helper functions
function detectDocumentType(text: string, fileName?: string): string {
  const lowerText = text.toLowerCase()
  const lowerFileName = fileName?.toLowerCase() || ""
  
  // Check for exam-related keywords
  if (
    lowerText.includes("đề thi") ||
    lowerText.includes("câu hỏi") ||
    lowerText.includes("ma trận") ||
    lowerFileName.includes("đề") ||
    lowerFileName.includes("exam")
  ) {
    return "exam"
  }
  
  // Check for textbook content
  if (
    lowerText.includes("chương") ||
    lowerText.includes("bài") ||
    lowerText.includes("sgk") ||
    lowerFileName.includes("sgk")
  ) {
    return "textbook"
  }
  
  // Check for question bank
  if (
    lowerText.includes("ngân hàng") ||
    lowerText.includes("câu hỏi") ||
    lowerText.includes("trắc nghiệm")
  ) {
    return "question_bank"
  }
  
  return "document"
}

function extractStructure(text: string): any {
  const lines = text.split("\n").filter((line) => line.trim().length > 0)
  const sections: any[] = []
  let currentSection: any = null

  for (const line of lines) {
    // Detect headings (lines that are short and might be titles)
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

  return { sections: sections.slice(0, 10) } // Limit to 10 sections
}

function extractTopics(text: string): string[] {
  const topics: string[] = []
  const lowerText = text.toLowerCase()
  
  // Common educational topics in Vietnamese
  const topicKeywords: { [key: string]: string } = {
    "toán học": "Toán học",
    "văn học": "Văn học",
    "vật lý": "Vật lý",
    "hóa học": "Hóa học",
    "sinh học": "Sinh học",
    "lịch sử": "Lịch sử",
    "địa lý": "Địa lý",
    "tiếng anh": "Tiếng Anh",
    "phương trình": "Phương trình",
    "hàm số": "Hàm số",
    "hình học": "Hình học",
  }

  for (const [keyword, topic] of Object.entries(topicKeywords)) {
    if (lowerText.includes(keyword) && !topics.includes(topic)) {
      topics.push(topic)
    }
  }

  return topics.slice(0, 5) // Limit to 5 topics
}

function generateSummary(text: string): string {
  // Simple summary: first 200 characters
  const sentences = text.split(/[.!?]\s+/).filter((s) => s.trim().length > 20)
  if (sentences.length > 0) {
    return sentences.slice(0, 3).join(". ") + "."
  }
  return text.substring(0, 200) + (text.length > 200 ? "..." : "")
}
