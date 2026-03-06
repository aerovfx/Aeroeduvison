import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join } from "path"
import { existsSync } from "fs"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * GET /api/exam-matrices/file/[...path]
 * Serve matrix files (images) with authentication
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const filePath = params.path.join("/")
    
    // Security: Only allow files from uploads/matrices/
    if (!filePath.startsWith("matrices/")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Resolve file path
    const fullPath = join(process.cwd(), "uploads", filePath)
    
    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 })
    }

    // Read file
    const fileBuffer = await readFile(fullPath)
    
    // Determine content type from extension
    const ext = filePath.split(".").pop()?.toLowerCase()
    const contentTypeMap: { [key: string]: string } = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      pdf: "application/pdf",
      jfif: "image/jpeg",
    }
    const contentType = contentTypeMap[ext || ""] || "application/octet-stream"

    // Return file with appropriate headers
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    })
  } catch (error: any) {
    console.error("File serve error:", error)
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    )
  }
}
