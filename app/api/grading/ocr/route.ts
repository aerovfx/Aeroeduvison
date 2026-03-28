/**
 * OCR API Bridge - Connects to Python OMR + Text Detection (CTPN/EAST-inspired) service
 *
 * Endpoints:
 *   POST /api/grading/ocr
 *     - Reads student info from exam sheet using DL text detection + Tesseract OCR
 *     - Returns: student_name, student_id (SBD), exam_code, birth_date
 */

import { NextRequest, NextResponse } from "next/server";

const OMR_SERVICE_URL = process.env.OMR_SERVICE_URL || "http://localhost:8002";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "No image provided" },
        { status: 400 }
      );
    }

    const mode = formData.get("mode") as string || "ocr";

    // Forward to Python OMR service
    const pythonFormData = new FormData();
    pythonFormData.append("image", image);

    let endpoint = "/omr/ocr";
    if (mode === "detect-text") {
      endpoint = "/omr/detect-text";
      pythonFormData.append("draw_overlay", "true");
    } else if (mode === "full") {
      endpoint = "/omr/process-full";
      const answerKey = formData.get("answer_key") as string;
      if (answerKey) {
        pythonFormData.append("answer_key", answerKey);
      }
      pythonFormData.append("enable_ocr", "true");
    }

    const response = await fetch(`${OMR_SERVICE_URL}${endpoint}`, {
      method: "POST",
      body: pythonFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: `OMR service error: ${errText}` },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    // If Python OMR service is not available, return graceful error
    if (error.code === "ECONNREFUSED" || error.cause?.code === "ECONNREFUSED") {
      return NextResponse.json(
        {
          success: false,
          error: "OMR/OCR service not running. Start with: cd python-omr && python omr_server.py",
          service_status: "offline",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
