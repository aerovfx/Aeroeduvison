import { NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import { join } from "path"

// GET /api/transcript/local/check-venv - Check if MLX venv exists
export async function GET() {
  try {
    const appSupportDir = join(
      process.env.HOME || process.env.USERPROFILE || '',
      'Library',
      'Application Support',
      'Aeroeduvison',
      'mlx-env'
    )

    const venvPython = join(appSupportDir, 'bin', 'python3')
    const exists = existsSync(venvPython)

    return NextResponse.json({
      exists,
      path: appSupportDir,
    })
  } catch (error: any) {
    return NextResponse.json({
      exists: false,
      error: error.message,
    })
  }
}
