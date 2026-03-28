/**
 * ==========================================================================
 * API Route: /api/grading/omr-process
 * ==========================================================================
 * Bridge endpoint: Next.js → Python OMR Service (port 8002)
 *
 * Pipeline:
 * 1. Nhận ảnh bài thi từ client
 * 2. Gọi Python OMR service (marker detection + flatten + bubble read)
 * 3. Trả kết quả + ảnh overlay về client
 *
 * Features:
 * - Marker-based perspective transform (làm phẳng phiếu)
 * - 14+ marker đen cố định để định vị chính xác
 * - Đọc bubble Phần I (40 MCQ), Phần II (8 Đ/S), Phần III (6 điền số)
 * - Đọc SBD + Mã đề thi
 * - Overlay visualization trên ảnh gốc
 * - Fallback về recognize route cũ nếu OMR service không khả dụng
 * ==========================================================================
 */

import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 60

const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || "http://localhost:8002"

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File
    if (!file) {
      return NextResponse.json({ error: "No image file" }, { status: 400 })
    }

    const debug = formData.get("debug") === "true"
    const returnOverlay = formData.get("return_overlay") !== "false"
    const returnFlattened = formData.get("return_flattened") === "true"
    const answerKey = formData.get("answer_key") as string | null

    // Thử gọi Python OMR service
    try {
      const omrForm = new FormData()
      omrForm.append("image", file)
      omrForm.append("debug", debug ? "true" : "false")
      omrForm.append("return_overlay", returnOverlay ? "true" : "false")
      omrForm.append("return_flattened", returnFlattened ? "true" : "false")
      if (answerKey) {
        omrForm.append("answer_key", answerKey)
      }

      const omrResponse = await fetch(`${OMR_SERVICE_URL}/omr/process`, {
        method: "POST",
        body: omrForm,
        signal: AbortSignal.timeout(30000),
      })

      if (omrResponse.ok) {
        const result = await omrResponse.json()
        return NextResponse.json({
          ...result,
          _service: "python-omr-v2",
        })
      }

      console.warn(`OMR service returned ${omrResponse.status}, falling back...`)
    } catch (omrError: any) {
      console.warn(`OMR service unavailable: ${omrError.message}, falling back...`)
    }

    // Fallback: gọi recognize route cũ
    const fallbackForm = new FormData()
    fallbackForm.append("image", file)

    const origin = req.nextUrl.origin
    const fallbackRes = await fetch(`${origin}/api/grading/recognize`, {
      method: "POST",
      body: fallbackForm,
      signal: AbortSignal.timeout(25000),
    })

    if (!fallbackRes.ok) {
      return NextResponse.json(
        { error: "Both OMR service and fallback failed" },
        { status: 500 }
      )
    }

    const fallbackResult = await fallbackRes.json()
    return NextResponse.json({
      ...fallbackResult,
      _service: "fallback-recognize-v1",
    })

  } catch (error: any) {
    console.error("OMR process error:", error)
    return NextResponse.json(
      { error: error.message || "Processing failed" },
      { status: 500 }
    )
  }
}


/**
 * GET: Health check + template info
 */
export async function GET() {
  try {
    const healthRes = await fetch(`${OMR_SERVICE_URL}/omr/health`, {
      signal: AbortSignal.timeout(3000),
    })

    if (healthRes.ok) {
      const health = await healthRes.json()

      // Also get template info
      const templateRes = await fetch(`${OMR_SERVICE_URL}/omr/template`, {
        signal: AbortSignal.timeout(3000),
      })
      const template = templateRes.ok ? await templateRes.json() : null

      return NextResponse.json({
        service: "python-omr-v2",
        status: "available",
        health,
        template,
      })
    }

    return NextResponse.json({
      service: "fallback-recognize-v1",
      status: "omr-unavailable",
    })
  } catch {
    return NextResponse.json({
      service: "fallback-recognize-v1",
      status: "omr-unavailable",
    })
  }
}
