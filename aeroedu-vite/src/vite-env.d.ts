/// <reference types="vite/client" />

/**
 * Khai báo TypeScript cho tất cả VITE_ env vars
 * Thêm vào đây bất cứ khi nào thêm biến mới vào .env
 */
interface ImportMetaEnv {
  // Backend API endpoint (Next.js hoặc Rust backend)
  readonly VITE_API_URL: string

  // WebSocket server URL
  readonly VITE_WS_URL: string

  // Rust aero-backend (quiz, grading)
  readonly VITE_RUST_BACKEND_URL: string

  // Hand tracking / camera guard WebSocket
  readonly VITE_TRACKING_SERVER_URL: string

  // Python ML / AI inference server
  readonly VITE_PYTHON_API_URL: string

  // App metadata
  readonly VITE_APP_NAME: string
  readonly VITE_APP_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
