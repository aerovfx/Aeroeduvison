import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import { join } from "path"

// POST /api/transcript/local/setup - Setup MLX environment
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { autoDownload = true } = body

    // Get the path to setup_mlx.py script
    const scriptPath = join(process.cwd(), 'transcript-video', 'scripts', 'setup_mlx.py')

    // Create a readable stream for progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        return new Promise((resolve, reject) => {
          const pythonScript = spawn('python3', [
            scriptPath,
            '--env-dir',
            join(
              process.env.HOME || process.env.USERPROFILE || '',
              'Library',
              'Application Support',
              'Aeroeduvison',
              'mlx-env'
            ),
          ])

          pythonScript.stdout.on('data', (data) => {
            const text = data.toString()
            controller.enqueue(encoder.encode(text))
          })

          pythonScript.stderr.on('data', (data) => {
            const text = data.toString()
            controller.enqueue(encoder.encode(`data: {"type":"error","message":"${text.trim()}"}\n\n`))
          })

          pythonScript.on('close', (code) => {
            if (code === 0) {
              controller.enqueue(encoder.encode('data: {"type":"complete","message":"Setup complete!"}\n\n'))
              controller.close()
              resolve()
            } else {
              controller.enqueue(encoder.encode(`data: {"type":"error","message":"Setup failed with code ${code}"}\n\n`))
              controller.close()
              reject(new Error(`Setup failed with code ${code}`))
            }
          })

          pythonScript.on('error', (err) => {
            controller.enqueue(encoder.encode(`data: {"type":"error","message":"${err.message}"}\n\n`))
            controller.close()
            reject(err)
          })
        })
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
