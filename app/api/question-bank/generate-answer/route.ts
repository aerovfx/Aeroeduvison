import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { GoogleGenerativeAI } from "@google/generative-ai"

/**
 * POST /api/question-bank/generate-answer
 * Sinh đáp án mẫu / hướng dẫn chấm từ nội dung câu hỏi (AI).
 * Thử lần lượt: Gemini → Claude (Anthropic) → Grok → OpenRouter → OpenAI → Ollama (localhost). Trả lỗi rõ ràng nếu không có API/key hợp lệ.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { content, questionType, subject, grade } = body as {
      content?: string
      questionType?: string
      subject?: string
      grade?: string
    }

    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json(
        { error: "Nội dung câu hỏi (content) là bắt buộc" },
        { status: 400 }
      )
    }

    const prompt = buildPrompt(content.trim(), { questionType, subject, grade })

    // Thử lần lượt: Gemini → Claude → Grok → OpenRouter → OpenAI → Ollama (localhost)
    let lastError: string | null = null

    // 1. Gemini
    const geminiKey = process.env.GEMINI_API_KEY?.trim()
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
        const result = await model.generateContent(prompt)
        const text = result.response.text().trim()
        if (text) return NextResponse.json({ answer: text })
      } catch (e: any) {
        lastError = e?.message || "Gemini lỗi"
        const isKeyError =
          /API key not valid|API_KEY_INVALID|403|401/i.test(lastError)
        if (isKeyError) {
          lastError =
            "Gemini: API key không hợp lệ. Vui lòng kiểm tra GEMINI_API_KEY tại Google AI Studio (https://aistudio.google.com/apikey)."
        }
        console.warn("[question-bank/generate-answer] Gemini failed:", lastError)
      }
    } else {
      lastError =
        "Chưa cấu hình GEMINI_API_KEY. Có thể dùng ANTHROPIC_API_KEY (Claude), GROK_API_KEY, OPENROUTER_API_KEY hoặc OPENAI_API_KEY."
    }

    // 2. Claude (Anthropic)
    const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim()
    if (anthropicKey) {
      try {
        const text = await claudeGenerate(anthropicKey, prompt)
        if (text) return NextResponse.json({ answer: text })
      } catch (e: any) {
        lastError = e?.message || "Claude (Anthropic) lỗi"
        console.warn("[question-bank/generate-answer] Claude failed:", lastError)
      }
    }

    // 3. Grok (X.AI)
    const grokKey = process.env.GROK_API_KEY?.trim()
    if (grokKey && grokKey.startsWith("xai-")) {
      try {
        const text = await chatCompletion(grokKey, "https://api.x.ai/v1/chat/completions", "grok-beta", prompt)
        if (text) return NextResponse.json({ answer: text })
      } catch (e: any) {
        lastError = e?.message || "Grok lỗi"
        console.warn("[question-bank/generate-answer] Grok failed:", lastError)
      }
    }

    // 4. OpenRouter
    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim()
    if (openRouterKey && openRouterKey.startsWith("sk-or-")) {
      try {
        const model = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-exp:free"
        const text = await chatCompletion(
          openRouterKey,
          "https://openrouter.ai/api/v1/chat/completions",
          model,
          prompt,
          { "HTTP-Referer": process.env.NEXTAUTH_URL || "http://localhost:3000" }
        )
        if (text) return NextResponse.json({ answer: text })
      } catch (e: any) {
        lastError = e?.message || "OpenRouter lỗi"
        console.warn("[question-bank/generate-answer] OpenRouter failed:", lastError)
      }
    }

    // 5. OpenAI
    const openaiKey = process.env.OPENAI_API_KEY?.trim()
    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const text = await chatCompletion(openaiKey, "https://api.openai.com/v1/chat/completions", "gpt-4o-mini", prompt)
        if (text) return NextResponse.json({ answer: text })
      } catch (e: any) {
        lastError = e?.message || "OpenAI lỗi"
        console.warn("[question-bank/generate-answer] OpenAI failed:", lastError)
      }
    }

    // 6. Ollama (localhost) - không cần API key
    const ollamaUrl = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "")
    try {
      const text = await ollamaGenerate(ollamaUrl, prompt)
      if (text) return NextResponse.json({ answer: text })
    } catch (e: any) {
      lastError = e?.message || "Ollama không chạy hoặc model chưa pull. Chạy: ollama serve và ollama pull <model>."
      console.warn("[question-bank/generate-answer] Ollama failed:", lastError)
    }

    return NextResponse.json(
      {
        error:
          lastError ||
          "Không thể sinh đáp án. Cấu hình GEMINI_API_KEY, ANTHROPIC_API_KEY (Claude), GROK_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY hoặc chạy Ollama local (ollama serve, ollama pull llama3.2).",
      },
      { status: 503 }
    )
  } catch (e: any) {
    console.error("[question-bank/generate-answer]", e)
    return NextResponse.json(
      { error: e?.message || "Không thể sinh đáp án" },
      { status: 500 }
    )
  }
}

function buildPrompt(
  content: string,
  ctx: { questionType?: string; subject?: string; grade?: string }
): string {
  const { questionType, subject, grade } = ctx
  return `Bạn là giáo viên chuyên soạn đề và đáp án. Dựa trên câu hỏi sau, hãy viết **đáp án mẫu** hoặc **hướng dẫn chấm điểm** ngắn gọn, rõ ràng (dùng cho giáo viên chấm bài).

${subject ? `Môn: ${subject}` : ""}
${grade ? `Khối: ${grade}` : ""}
${questionType ? `Dạng câu: ${questionType}` : ""}

### Câu hỏi:
${content}

### Yêu cầu:
- Chỉ trả về nội dung đáp án / hướng dẫn chấm, không lặp lại câu hỏi.
- Nếu là câu trắc nghiệm hoặc trả lời ngắn: đáp án gọn, đúng trọng tâm.
- Nếu là câu tự luận: đáp án mẫu hoặc các ý chấm (bullet), có thể kèm thang điểm gợi ý.
- Dùng tiếng Việt, không markdown tiêu đề (không ##).`
}

async function chatCompletion(
  apiKey: string,
  url: string,
  model: string,
  prompt: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...extraHeaders,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Bạn là giáo viên chuyên soạn đề và đáp án. Trả lời ngắn gọn, chỉ nội dung đáp án hoặc hướng dẫn chấm, dùng tiếng Việt.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 2000,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `HTTP ${res.status}`)
  }
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  return typeof text === "string" ? text.trim() : ""
}

async function claudeGenerate(apiKey: string, prompt: string): Promise<string> {
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022"
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      temperature: 0.5,
      system:
        "Bạn là giáo viên chuyên soạn đề và đáp án. Trả lời ngắn gọn, chỉ nội dung đáp án hoặc hướng dẫn chấm, dùng tiếng Việt.",
      messages: [{ role: "user", content: prompt }],
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Claude HTTP ${res.status}`)
  }
  const data = await res.json()
  const block = data?.content?.[0]
  const text = block?.type === "text" ? block.text : undefined
  return typeof text === "string" ? text.trim() : ""
}

async function ollamaGenerate(ollamaUrl: string, prompt: string): Promise<string> {
  const model = process.env.OLLAMA_MODEL || "llama3.2:latest"
  const res = await fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.5, num_predict: 2000 },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(err || `Ollama HTTP ${res.status}`)
  }
  const data = await res.json()
  const text = data?.response
  return typeof text === "string" ? text.trim() : ""
}
