import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const files = formData.getAll("files") as File[]
    const side = formData.get("side") as string // "front" | "back"
    const answerKeyId = formData.get("answerKeyId") as string

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const maxSize = 20 * 1024 * 1024
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
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `${file.name}: vượt quá 20MB` },
          { status: 400 }
        )
      }

      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const ext = file.name.split(".").pop() || "jpg"
      const safeName = `${side || "img"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const filePath = join(uploadDir, safeName)

      await writeFile(filePath, buffer)

      const url = `/uploads/grading/${session.user.id}/${answerKeyId || "unsorted"}/${safeName}`
      uploaded.push({ originalName: file.name, url, side: side || "front" })
    }

    return NextResponse.json({ uploaded }, { status: 201 })
  } catch (error) {
    console.error("[GRADING_UPLOAD]", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
