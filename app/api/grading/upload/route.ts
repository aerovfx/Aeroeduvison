import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import sharp from "sharp"

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024
const TARGET_STORAGE_SIZE_BYTES = 900 * 1024

function normalizeSide(side: string | null): "front" | "back" {
  return side === "back" ? "back" : "front"
}

async function optimizeGradingImage(
  buffer: Buffer,
  side: "front" | "back"
): Promise<{ output: Buffer; ext: "webp"; contentType: "image/webp"; width: number; height: number; quality: number }> {
  let width = side === "front" ? 1400 : 1600
  let quality = side === "front" ? 72 : 78
  let best: { output: Buffer; width: number; height: number; quality: number } | null = null

  for (let attempt = 0; attempt < 7; attempt++) {
    let pipeline = sharp(buffer)
      .rotate()
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .grayscale()
      .normalise()

    if (side === "front") {
      // Front side has fixed bubbles/markers: keep high-contrast black-white.
      pipeline = pipeline.blur(0.2).sharpen().threshold(172, { grayscale: true })
    } else {
      // Back side may contain handwriting: keep smooth grayscale details.
      pipeline = pipeline.sharpen({ sigma: 1.1, m1: 1, m2: 2 })
    }

    const out = await pipeline
      .webp({
        quality,
        effort: 6,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true })

    best = {
      output: out.data,
      width: out.info.width,
      height: out.info.height,
      quality,
    }

    if (out.data.length <= TARGET_STORAGE_SIZE_BYTES) {
      break
    }

    if (quality > 48) {
      quality -= 8
    } else {
      width = Math.max(900, Math.round(width * 0.9))
    }
  }

  return {
    output: best!.output,
    ext: "webp",
    contentType: "image/webp",
    width: best!.width,
    height: best!.height,
    quality: best!.quality,
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const side = normalizeSide(formData.get("side") as string | null)
    const answerKeyId = formData.get("answerKeyId") as string

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

    const uploadDir = join(
      process.cwd(),
      "uploads",
      "grading",
      session.user.id,
      answerKeyId || "unsorted"
    )
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const uploaded: { originalName: string; url: string; side: string }[] = []

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        return NextResponse.json(
          { error: `${file.name}: chỉ hỗ trợ JPG, PNG, WebP` },
          { status: 400 }
        )
      }
      if (file.size > MAX_UPLOAD_SIZE_BYTES) {
        return NextResponse.json(
          { error: `${file.name}: vượt quá 20MB` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const optimized = await optimizeGradingImage(buffer, side)
      const safeName = `${side}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${optimized.ext}`
      const filePath = join(uploadDir, safeName)

      await writeFile(filePath, optimized.output)

      const url = `/uploads/grading/${session.user.id}/${answerKeyId || "unsorted"}/${safeName}`
      uploaded.push({ originalName: file.name, url, side })
    }

    return NextResponse.json({ uploaded }, { status: 201 })
  } catch (error) {
    console.error("[GRADING_UPLOAD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
