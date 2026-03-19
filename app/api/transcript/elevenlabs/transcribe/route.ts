import { NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

// POST /api/transcript/elevenlabs/transcribe
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File | null
    const apiKey = (formData.get("apiKey") || "").toString().trim()
    const sourceLanguage = (formData.get("sourceLanguage") || "auto").toString()
    const targetLanguage = (formData.get("targetLanguage") || "vi").toString()

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 })
    }
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ElevenLabs API key" }, { status: 400 })
    }

    const elevenForm = new FormData()
    elevenForm.append("file", audioFile, audioFile.name || "recording.webm")
    elevenForm.append("model_id", "scribe_v1")
    if (sourceLanguage !== "auto") {
      elevenForm.append("language_code", sourceLanguage)
    }

    const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: elevenForm,
    })

    if (!response.ok) {
      const errorPayload = await response.text().catch(() => "")
      return NextResponse.json(
        { error: `ElevenLabs transcription failed (${response.status}): ${errorPayload.slice(0, 300)}` },
        { status: 502 }
      )
    }

    const data = await response.json().catch(() => ({}))
    const text = (data?.text || data?.transcript || "").toString().trim()
    const detectedLanguage = (data?.language_code || sourceLanguage || "auto").toString()
    const translatedText = await translateTranscriptIfNeeded({
      text,
      sourceLanguage: detectedLanguage,
      targetLanguage,
    })

    const segments = text
      ? [
          {
            original: text,
            translated: translatedText || undefined,
            language: detectedLanguage,
          },
        ]
      : []

    return NextResponse.json({
      transcript: text,
      translated: translatedText || "",
      language: detectedLanguage,
      segments,
      provider: "elevenlabs",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[ElevenLabs Transcript] Error:", message)
    return NextResponse.json({ error: `ElevenLabs transcription error: ${message}` }, { status: 500 })
  }
}

type TranslationInput = {
  text: string
  sourceLanguage: string
  targetLanguage: string
}

async function translateTranscriptIfNeeded({
  text,
  sourceLanguage,
  targetLanguage,
}: TranslationInput): Promise<string> {
  const normalizedTarget = normalizeLanguageCode(targetLanguage)
  const normalizedSource = normalizeLanguageCode(sourceLanguage)

  if (!text.trim()) return ""
  if (!normalizedTarget || normalizedTarget === "auto") return ""
  if (normalizedSource && normalizedSource === normalizedTarget) return ""

  const prompt = [
    `Translate this transcript into ${getLanguageLabel(normalizedTarget)}.`,
    "Keep original meaning and tone.",
    "Output only translated text, no explanation.",
    "",
    text,
  ].join("\n")

  const openaiKey = process.env.OPENAI_API_KEY?.trim()
  if (openaiKey && openaiKey.startsWith("sk-")) {
    try {
      const translated = await translateWithOpenAI(openaiKey, prompt)
      if (translated) return translated
    } catch (error) {
      console.warn("[ElevenLabs Transcript] OpenAI translate failed:", error)
    }
  }

  const geminiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "").trim()
  if (geminiKey) {
    try {
      const translated = await translateWithGemini(geminiKey, prompt)
      if (translated) return translated
    } catch (error) {
      console.warn("[ElevenLabs Transcript] Gemini translate failed:", error)
    }
  }

  return ""
}

function normalizeLanguageCode(code: string): string {
  return (code || "").trim().toLowerCase()
}

function getLanguageLabel(code: string): string {
  const labels: Record<string, string> = {
    vi: "Vietnamese",
    en: "English",
    zh: "Chinese",
    ja: "Japanese",
    ko: "Korean",
    fr: "French",
    de: "German",
    es: "Spanish",
  }
  return labels[code] || code
}

async function translateWithOpenAI(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a precise translation engine.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2,
      max_tokens: 3000,
    }),
  })

  if (!response.ok) {
    const err = await response.text().catch(() => "")
    throw new Error(err || `OpenAI HTTP ${response.status}`)
  }

  const data = await response.json().catch(() => ({}))
  const text = data?.choices?.[0]?.message?.content
  return typeof text === "string" ? text.trim() : ""
}

async function translateWithGemini(apiKey: string, prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_TRANSLATION_MODEL || process.env.GEMINI_MODEL || "gemini-2.0-flash-exp",
  })
  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}
