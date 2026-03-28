import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"

// GET /api/documents/file/[...path] - Serve document files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { path } = await params
    // Reconstruct the file path
    const filePath = Array.isArray(path) ? path.join("/") : path
    
    // Security: Only allow access to user's own files (documents or results)
    const isDocumentsPath = filePath.startsWith(`documents/${session.user.id}/`)
    const isResultsPath = filePath.startsWith(`results/${session.user.id}/`)
    
    if (!isDocumentsPath && !isResultsPath) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Construct full file path
    const fullPath = join(process.cwd(), "uploads", filePath)
    
    console.log("Serving file:", { filePath, fullPath, exists: existsSync(fullPath) })
    
    // Security: Prevent directory traversal
    if (!fullPath.startsWith(join(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 })
    }

    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(fullPath)
    
    // Determine content type from file extension
    const extension = fullPath.split(".").pop()?.toLowerCase()
    const contentTypeMap: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      pdf: "application/pdf",
      gif: "image/gif",
      webp: "image/webp",
      txt: "text/plain; charset=utf-8",
      md: "text/markdown; charset=utf-8",
    }
    const contentType = contentTypeMap[extension || ""] || "application/octet-stream"

    // Return file with proper headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch (error: any) {
    console.error("Serve file error:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}
