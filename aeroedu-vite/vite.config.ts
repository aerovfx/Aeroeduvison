import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env / .env.production vào process.env để dùng trong config này
  // KHÔNG dùng process.env.VITE_* trực tiếp — phải qua loadEnv()
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      // Bundle analyzer — chạy: npm run build để xem stats.html
      visualizer({ open: false, filename: 'stats.html' }),
      // Pre-compress build output — nginx sẽ serve trực tiếp .gz / .br
      // → giảm ~70% kích thước transfer cho three-vendor / chart-vendor
      viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 1024,
        deleteOriginFile: false,
      }),
      viteCompression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 1024,
        deleteOriginFile: false,
      }),
    ],

    resolve: {
      // Dedupe React so every dep (including @react-three/fiber) uses the exact
      // same module instance — prevents the dual-reconciler "reading 'S'" crash.
      dedupe: ['react', 'react-dom'],
      alias: {
        // Giữ nguyên alias '@/' như Next.js project
        '@': path.resolve(__dirname, './src'),
        // Fix @mediapipe/tasks-vision (pulled in by @react-three/drei) — dùng CJS bundle
        '@mediapipe/tasks-vision': path.resolve(
          __dirname,
          'node_modules/@mediapipe/tasks-vision/vision_bundle.cjs'
        ),
      },
    },

    // Dev server proxy → Rust aero-backend (API Gateway port 8090)
    //
    // Routing map — tất cả /api/* đều qua aero-backend:8090, nó proxy tiếp:
    //   /api/auth/*           → auth-service        :8092
    //   /api/courses/*        → course-service      :8093
    //   /api/admin/*          → admin-service       :8094
    //   /api/students/*       → student-service     :8095
    //   /api/classes/*        → student-service     :8095
    //   /api/analytics/*      → analytics-service   :8104
    //   /api/assignments/*    → assignments-service :8102
    //   /api/achievements/*   → achievements-service:8103
    //   /api/chat/*           → chat-service        :8101
    //   /api/emotion/*        → emotion-service     :8105
    //   /api/grading/*        → grading-service     :8100
    //   /api/documents/*      → media-service       :8098
    //   /api/question-bank/*  → media-service       :8098
    //   /api/questions/*      → media-service       :8098
    //   /api/exam-matrices/*  → media-service       :8098
    //   /api/exams/*          → media-service       :8098
    //   /api/camera/*         → camera-iot-service  :8099
    //   /api/iot/*            → camera-iot-service  :8099
    //   /api/stem/*           → stem-service        :8097
    //   /api/ai*              → ai-service          :8096
    //   /api/teacher/*        → teacher-service     :8106
    //   /api/online-exam-room → exam-service        :8107
    //   /api/transcript/*     → transcript-service  :8108
    //   /api/latex-projects/* → latex-service       :8109
    //   /api/vision-tracker/* → emotion-service     :8105 (path rewrite + stubs)
    //   /api/users            → student-service     :8095
    //   /api/student/*        → student-service     :8095
    //
    // ✅ Next.js đã xóa hoàn toàn — 100% API qua Rust aero-backend:
    //   /api/vision-tracker  → aero-backend → emotion-service :8105 (path rewrite + stubs)
    //   /api/users           → aero-backend → student-service :8095
    //   /api/student         → aero-backend → student-service :8095
    //   /mediapipe-wasm/*    → Vite public/ static (không cần proxy)
    //   /models/*            → Vite public/ static (không cần proxy)
    server: {
      port: 5173,
      proxy: {
        // ── Rust aero-backend catch-all (port 8090) ──────────────────────────
        // Tất cả /api/* → aero-backend proxies đến microservices:
        //   auth, courses, admin, analytics, classes, students, grading,
        //   documents, questions, exam-matrices, exams, upload, camera, iot,
        //   stem, ai*, chat, emotion, assignments, achievements, question-bank,
        //   vector-similarity, llm-grading, teacher, online-exam-room,
        //   transcript, latex-projects, vision-tracker, users, student
        '/api': {
          target: env.VITE_RUST_BACKEND_URL || 'http://localhost:8090',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: env.VITE_WS_URL || 'http://localhost:8090',
          ws: true,
          changeOrigin: true,
        },
      },
    },

    // Build optimizations
    build: {
      target: 'esnext',
      sourcemap: false,
      // ⚠️  Quan trọng: filter modulepreload để KHÔNG preload three-vendor /
      // chart-vendor / socket-vendor trên landing page. Các chunk này chỉ được
      // tải khi user vào /labs, /dashboard/analytics, /chat … — tức là dynamic
      // import. Nếu không filter, Vite mặc định sẽ emit <link rel="modulepreload">
      // cho TẤT CẢ chunk trong graph, kéo ~1.5 MB JS không cần thiết ngay lúc
      // đầu tiên và đẩy FCP từ ~5s xuống đáng kể khi bỏ.
      modulePreload: {
        polyfill: true,
        resolveDependencies: (_filename, deps) => {
          return deps.filter((dep) => {
            return (
              !dep.includes('three-vendor') &&
              !dep.includes('chart-vendor') &&
              !dep.includes('socket-vendor') &&
              // Các icon chunk nhỏ của lucide-react cũng không cần preload
              // (trình duyệt sẽ request khi Landing mount)
              !/\/(atom|trending-up|bar-chart-3|play|menu|star|layers|x)-[A-Za-z0-9_-]+\.js$/.test(dep)
            )
          })
        },
      },
      rollupOptions: {
        external: [
          // Exclude mediapipe from bundle — loaded via CDN or not needed at runtime
          // Uncomment if still causing issues after alias fix:
          // '@mediapipe/tasks-vision',
        ],
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'query-vendor': ['@tanstack/react-query', 'axios'],
            'radix-vendor': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tabs',
              '@radix-ui/react-select',
              '@radix-ui/react-avatar',
            ],
            // 3D libraries — lazy loaded so only pulled when visiting lab pages
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            'chart-vendor': ['recharts'],
            'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'state-vendor': ['zustand'],
            // socket.io-client — chỉ load khi vào Chat / OnlineExamRoom (lazy)
            'socket-vendor': ['socket.io-client'],
          },
        },
      },
      chunkSizeWarningLimit: 1500,
      // CSS code-split: tách CSS theo chunk để file CSS chính không quá to
      cssCodeSplit: true,
    },

    // Optimize deps pre-bundling
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'lucide-react',
        // R3F v8 deps that ship as CJS and need ESM wrapping by Vite
        'use-sync-external-store',
        'use-sync-external-store/shim/with-selector',
        'react-reconciler',
        'react-reconciler/constants',
      ],
      exclude: [
        // mediapipe has its own CJS bundle via alias — keep excluded
        '@mediapipe/tasks-vision',
      ],
    },
  }
})
