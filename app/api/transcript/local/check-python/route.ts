import { NextRequest, NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

// GET /api/transcript/local/check-python - Check if Python 3.10+ is available
export async function GET() {
  try {
    // Check common Python 3.10+ paths
    const pythonPaths = [
      "/opt/homebrew/bin/python3",
      "/usr/local/bin/python3",
      "python3",
    ]

    for (const pythonPath of pythonPaths) {
      try {
        const { stdout } = await execAsync(`${pythonPath} --version`)
        const version = stdout.trim().split(' ').pop()
        const [major, minor] = version?.split('.').map(Number) || []
        
        if (major && major >= 3 && minor && minor >= 10) {
          return NextResponse.json({
            available: true,
            version,
            path: pythonPath,
          })
        }
      } catch {
        continue
      }
    }

    return NextResponse.json({
      available: false,
      message: "Python 3.10+ not found. Please install Python via Homebrew: brew install python",
    })
  } catch (error: any) {
    return NextResponse.json({
      available: false,
      error: error.message,
    })
  }
}
