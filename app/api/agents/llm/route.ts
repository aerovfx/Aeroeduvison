import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { checkAISubscription } from "@/lib/subscription-check"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ─── Subscription Check ───────────────────────────────
    const subscriptionCheck = await checkAISubscription(session.user.id)
    if (!subscriptionCheck.allowed) {
      return NextResponse.json(
        {
          error: "SUBSCRIPTION_REQUIRED",
          message: subscriptionCheck.message,
          plan: subscriptionCheck.plan,
        },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { messages, config } = body

    // ─── Provider selection: OpenRouter → Ollama/OpenAI fallback ─────
    const openRouterKey = process.env.OPENROUTER_API_KEY || ""
    const useOpenRouter = openRouterKey.trim() &&
      (openRouterKey.startsWith("sk-or-") || openRouterKey.startsWith("ysk-or-"))

    let baseURL: string
    let apiKey: string
    let model: string
    let extraHeaders: Record<string, string> = {}

    if (useOpenRouter) {
      // Priority: OpenRouter (cloud AI)
      baseURL = "https://openrouter.ai/api/v1"
      apiKey = openRouterKey
      // Use a reliable, cost-effective model via OpenRouter
      // If client sends "gpt-4o-mini", use OpenRouter default model instead
      const openRouterModel = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"
      model = (config?.model === "gpt-4o-mini" || !config?.model)
        ? openRouterModel
        : config.model
      extraHeaders = {
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aeroeduvison.local",
        "X-Title": "AeroEduVison AI Tutor",
      }
      console.log("[LLM] Using OpenRouter:", model)
    } else {
      // Fallback: Ollama / OpenAI
      baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
      apiKey = process.env.OPENAI_API_KEY || ""
      model = config?.model || process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini"
      console.log("[LLM] Using local/OpenAI:", model)
    }

    let response: Response
    try {
      response = await fetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          ...extraHeaders,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: config?.maxTokens || 2048,
          temperature: config?.temperature || 0.7,
        }),
        signal: AbortSignal.timeout(30000), // 30s timeout
      })
    } catch (fetchErr: any) {
      console.error("[LLM] Primary fetch failed:", fetchErr.message)
      // Network error (e.g., Ollama not running, DNS failure)
      // Try fallback if we were using OpenRouter
      if (useOpenRouter) {
        console.log("[LLM] OpenRouter network error, trying local fallback...")
        try {
          return await tryFallback(messages, config)
        } catch {
          // fallback also failed
        }
      } else {
        // We were using local and it failed, try OpenRouter if available
        if (openRouterKey.trim()) {
          console.log("[LLM] Local LLM unavailable, trying OpenRouter...")
          try {
            return await tryOpenRouterFallback(openRouterKey, messages, config)
          } catch {
            // OpenRouter also failed
          }
        }
      }
      throw new Error(`Cannot connect to AI service: ${fetchErr.message}`)
    }

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[LLM] API error:", response.status, errorText)

      // If OpenRouter fails, try Ollama/OpenAI fallback
      if (useOpenRouter) {
        console.log("[LLM] OpenRouter error, trying local fallback...")
        try {
          return await tryFallback(messages, config)
        } catch {
          // fallback also failed
        }
      } else if (openRouterKey.trim()) {
        // Local failed, try OpenRouter
        console.log("[LLM] Local LLM error, trying OpenRouter...")
        try {
          return await tryOpenRouterFallback(openRouterKey, messages, config)
        } catch {
          // OpenRouter also failed
        }
      }

      throw new Error(`LLM API error: ${response.status} - ${errorText.substring(0, 200)}`)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice?.message?.content) {
      throw new Error("Empty response from AI model")
    }

    return NextResponse.json({
      content: choice.message.content,
      model: data.model || model,
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
        cost: useOpenRouter ? 0.001 : 0,
      },
    })
  } catch (error: any) {
    console.error("[LLM] Error:", error.message)

    // If all AI providers fail, return a helpful offline response
    const isNetworkError = error.message?.includes("Cannot connect") ||
      error.message?.includes("fetch failed") ||
      error.message?.includes("ECONNREFUSED")

    if (isNetworkError) {
      return NextResponse.json({
        content: "⚠️ Hiện tại không thể kết nối với dịch vụ AI. Có thể do:\n\n" +
          "• OpenRouter API key chưa hoạt động hoặc hết hạn\n" +
          "• Ollama (local AI) chưa được khởi chạy — hãy chạy `ollama serve` trong terminal\n" +
          "• Mạng internet đang gặp sự cố\n\n" +
          "Bạn có thể thử lại sau hoặc kiểm tra cấu hình trong `.env.local`.",
        model: "offline-fallback",
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0, cost: 0 },
      })
    }

    return NextResponse.json(
      { error: error.message || "LLM call failed" },
      { status: 500 }
    )
  }
}

/**
 * Try local Ollama/OpenAI as fallback
 */
async function tryFallback(messages: any[], config: any) {
  const fallbackURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1"
  const fallbackKey = process.env.OPENAI_API_KEY || ""
  const fallbackModel = process.env.OPENAI_DEFAULT_MODEL || "gpt-4o-mini"

  const fallbackRes = await fetch(`${fallbackURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${fallbackKey}`,
    },
    body: JSON.stringify({
      model: fallbackModel,
      messages,
      max_tokens: config?.maxTokens || 2048,
      temperature: config?.temperature || 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!fallbackRes.ok) throw new Error("Fallback failed")
  const fallbackData = await fallbackRes.json()
  const choice = fallbackData.choices?.[0]
  if (!choice?.message?.content) throw new Error("Empty fallback response")

  return NextResponse.json({
    content: choice.message.content,
    model: fallbackModel + " (fallback)",
    usage: {
      promptTokens: fallbackData.usage?.prompt_tokens || 0,
      completionTokens: fallbackData.usage?.completion_tokens || 0,
      totalTokens: fallbackData.usage?.total_tokens || 0,
      cost: 0,
    },
  })
}

/**
 * Try OpenRouter as fallback when local LLM is down
 */
async function tryOpenRouterFallback(apiKey: string, messages: any[], config: any) {
  const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini"

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://aeroeduvison.local",
      "X-Title": "AeroEduVison AI Tutor",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: config?.maxTokens || 2048,
      temperature: config?.temperature || 0.7,
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!res.ok) throw new Error("OpenRouter fallback failed")
  const data = await res.json()
  const choice = data.choices?.[0]
  if (!choice?.message?.content) throw new Error("Empty OpenRouter response")

  return NextResponse.json({
    content: choice.message.content,
    model: (data.model || model) + " (fallback)",
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
      cost: 0.001,
    },
  })
}
