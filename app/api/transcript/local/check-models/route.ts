import { NextRequest, NextResponse } from "next/server"
import { existsSync } from "fs"
import { join } from "path"

// GET /api/transcript/local/check-models - Check if MLX models are downloaded
export async function GET() {
  try {
    const cacheDir = join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.cache',
      'huggingface',
      'hub'
    )

    // Check for Whisper model
    const whisperExists = existsSync(join(cacheDir, 'models--mlx-community--whisper-large-v3-turbo'))
    
    // Check for Gemma model (for translation)
    const gemmaExists = existsSync(join(cacheDir, 'models--mlx-community--gemma-3-4b-it-qat-4bit'))

    const ready = whisperExists && gemmaExists

    return NextResponse.json({
      ready,
      models: {
        whisper: whisperExists,
        gemma: gemmaExists,
      },
      cacheDir,
    })
  } catch (error: any) {
    return NextResponse.json({
      ready: false,
      error: error.message,
    })
  }
}
