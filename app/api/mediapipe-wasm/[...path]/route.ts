import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ALLOWED = new Set([
  "vision_wasm_internal.js",
  "vision_wasm_internal.wasm",
  "vision_wasm_nosimd_internal.js",
  "vision_wasm_nosimd_internal.wasm",
]);

const MIME: Record<string, string> = {
  ".js": "application/javascript",
  ".wasm": "application/wasm",
};

/**
 * Serve MediaPipe tasks-vision WASM/JS from public folder with correct MIME.
 * GET /api/mediapipe-wasm/wasm/vision_wasm_internal.js
 * Avoids CDN 404 and "Unexpected token '<'" when static public returns HTML.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments } = await context.params;
  const fileName = pathSegments[pathSegments.length - 1];
  if (!fileName || !ALLOWED.has(fileName)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ext = fileName.endsWith(".wasm") ? ".wasm" : ".js";
  const contentType = MIME[ext] ?? "application/octet-stream";

  try {
    const publicDir = join(process.cwd(), "public", "mediapipe-tasks-vision", "wasm");
    const filePath = join(publicDir, fileName);
    const buf = await readFile(filePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    console.error("[mediapipe-wasm]", e);
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
