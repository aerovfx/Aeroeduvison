import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { messages, config } = body

    // Use Vercel AI SDK hoặc direct OpenAI API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config?.model || "gpt-4o-mini",
        messages,
        max_tokens: config?.maxTokens || 2048,
        temperature: config?.temperature || 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error("OpenAI API error")
    }

    const data = await response.json()
    const choice = data.choices[0]

    return NextResponse.json({
      content: choice.message.content,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
        cost: 0.0001, // Simplified cost calculation
      },
    })
  } catch (error: any) {
    console.error("LLM API error:", error)
    return NextResponse.json(
      { error: error.message || "LLM call failed" },
      { status: 500 }
    )
  }
}
