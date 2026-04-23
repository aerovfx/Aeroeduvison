// vite.config.ts
import { defineConfig, loadEnv } from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      // Bundle analyzer — chạy: npm run build để xem stats.html
      visualizer({ open: false, filename: "stats.html" })
    ],
    resolve: {
      alias: {
        // Giữ nguyên alias '@/' như Next.js project
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        // Fix @mediapipe/tasks-vision (pulled in by @react-three/drei) — dùng CJS bundle
        "@mediapipe/tasks-vision": path.resolve(
          __vite_injected_original_dirname,
          "node_modules/@mediapipe/tasks-vision/vision_bundle.cjs"
        )
      }
    },
    // Dev server proxy → Rust aero-backend (API Gateway port 8090)
    // aero-backend tự proxy tiếp: /api/auth/* → auth-service:8092, /api/courses/* → course-service, ...
    server: {
      port: 5173,
      proxy: {
        // ── Next.js routes (port 3000) ───────────────────────────────────────
        // These must come BEFORE the generic /api catch-all so Vite matches them first.
        // Next.js handles: classes (Prisma + session auth), auth, user management.
        "/api/classes": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/users": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/teacher": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/auth": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/vision-tracker": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/questions": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/exam-matrices": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/exams": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/latex-projects": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/online-exam-room": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/grading": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/documents": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/transcript": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        // Student API — agent-settings, exams → Next.js (Prisma)
        "/api/student": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        // Analytics & Courses dashboard — Prisma queries in Next.js
        "/api/analytics": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        // /api/courses/dashboard is a Next.js route; other /api/courses/* go to Rust
        "/api/courses/dashboard": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/camera": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/api/mediapipe-wasm": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/models": {
          target: env.VITE_NEXTJS_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        // ── Rust aero-backend catch-all (port 8090) ──────────────────────────
        "/api": {
          target: env.VITE_RUST_BACKEND_URL || "http://localhost:8090",
          changeOrigin: true,
          secure: false
        },
        "/socket.io": {
          target: env.VITE_WS_URL || "http://localhost:8090",
          ws: true,
          changeOrigin: true
        }
      }
    },
    // Build optimizations
    build: {
      target: "esnext",
      sourcemap: false,
      rollupOptions: {
        external: [
          // Exclude mediapipe from bundle — loaded via CDN or not needed at runtime
          // Uncomment if still causing issues after alias fix:
          // '@mediapipe/tasks-vision',
        ],
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "query-vendor": ["@tanstack/react-query", "axios"],
            "radix-vendor": [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-tabs",
              "@radix-ui/react-select",
              "@radix-ui/react-avatar"
            ],
            // 3D libraries — lazy loaded so only pulled when visiting lab pages
            "three-vendor": ["three", "@react-three/fiber", "@react-three/drei"],
            "chart-vendor": ["recharts"],
            "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
            "state-vendor": ["zustand"],
            // socket.io-client — chỉ load khi vào Chat / OnlineExamRoom (lazy)
            "socket-vendor": ["socket.io-client"]
          }
        }
      },
      chunkSizeWarningLimit: 1500
    },
    // Optimize deps pre-bundling
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-router-dom",
        "@tanstack/react-query",
        "axios",
        "zustand",
        "lucide-react"
      ],
      exclude: [
        "three",
        "@react-three/fiber",
        "@react-three/drei",
        "@mediapipe/tasks-vision"
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9zd2VldC1jb25maWRlbnQtbWVpdG5lci9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIExvYWQgLmVudiAvIC5lbnYucHJvZHVjdGlvbiB2XHUwMEUwbyBwcm9jZXNzLmVudiBcdTAxMTFcdTFFQzMgZFx1MDBGOW5nIHRyb25nIGNvbmZpZyBuXHUwMEUweVxuICAvLyBLSFx1MDBENE5HIGRcdTAwRjluZyBwcm9jZXNzLmVudi5WSVRFXyogdHJcdTFFRjFjIHRpXHUxRUJGcCBcdTIwMTQgcGhcdTFFQTNpIHF1YSBsb2FkRW52KClcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgXHUyMDE0IGNoXHUxRUExeTogbnBtIHJ1biBidWlsZCBcdTAxMTFcdTFFQzMgeGVtIHN0YXRzLmh0bWxcbiAgICAgIHZpc3VhbGl6ZXIoeyBvcGVuOiBmYWxzZSwgZmlsZW5hbWU6ICdzdGF0cy5odG1sJyB9KSxcbiAgICBdLFxuXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgLy8gR2lcdTFFRUYgbmd1eVx1MDBFQW4gYWxpYXMgJ0AvJyBuaFx1MDFCMCBOZXh0LmpzIHByb2plY3RcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLy8gRml4IEBtZWRpYXBpcGUvdGFza3MtdmlzaW9uIChwdWxsZWQgaW4gYnkgQHJlYWN0LXRocmVlL2RyZWkpIFx1MjAxNCBkXHUwMEY5bmcgQ0pTIGJ1bmRsZVxuICAgICAgICAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nOiBwYXRoLnJlc29sdmUoXG4gICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICdub2RlX21vZHVsZXMvQG1lZGlhcGlwZS90YXNrcy12aXNpb24vdmlzaW9uX2J1bmRsZS5janMnXG4gICAgICAgICksXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBEZXYgc2VydmVyIHByb3h5IFx1MjE5MiBSdXN0IGFlcm8tYmFja2VuZCAoQVBJIEdhdGV3YXkgcG9ydCA4MDkwKVxuICAgIC8vIGFlcm8tYmFja2VuZCB0XHUxRUYxIHByb3h5IHRpXHUxRUJGcDogL2FwaS9hdXRoLyogXHUyMTkyIGF1dGgtc2VydmljZTo4MDkyLCAvYXBpL2NvdXJzZXMvKiBcdTIxOTIgY291cnNlLXNlcnZpY2UsIC4uLlxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogNTE3MyxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgIC8vIFx1MjUwMFx1MjUwMCBOZXh0LmpzIHJvdXRlcyAocG9ydCAzMDAwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgICAgLy8gVGhlc2UgbXVzdCBjb21lIEJFRk9SRSB0aGUgZ2VuZXJpYyAvYXBpIGNhdGNoLWFsbCBzbyBWaXRlIG1hdGNoZXMgdGhlbSBmaXJzdC5cbiAgICAgICAgLy8gTmV4dC5qcyBoYW5kbGVzOiBjbGFzc2VzIChQcmlzbWEgKyBzZXNzaW9uIGF1dGgpLCBhdXRoLCB1c2VyIG1hbmFnZW1lbnQuXG4gICAgICAgICcvYXBpL2NsYXNzZXMnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS91c2Vycyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL3RlYWNoZXInOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9hdXRoJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvdmlzaW9uLXRyYWNrZXInOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9xdWVzdGlvbnMnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9leGFtLW1hdHJpY2VzJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvZXhhbXMnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9sYXRleC1wcm9qZWN0cyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvYXBpL29ubGluZS1leGFtLXJvb20nOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaS9ncmFkaW5nJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvZG9jdW1lbnRzJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvdHJhbnNjcmlwdCc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFN0dWRlbnQgQVBJIFx1MjAxNCBhZ2VudC1zZXR0aW5ncywgZXhhbXMgXHUyMTkyIE5leHQuanMgKFByaXNtYSlcbiAgICAgICAgJy9hcGkvc3R1ZGVudCc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIEFuYWx5dGljcyAmIENvdXJzZXMgZGFzaGJvYXJkIFx1MjAxNCBQcmlzbWEgcXVlcmllcyBpbiBOZXh0LmpzXG4gICAgICAgICcvYXBpL2FuYWx5dGljcyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIC9hcGkvY291cnNlcy9kYXNoYm9hcmQgaXMgYSBOZXh0LmpzIHJvdXRlOyBvdGhlciAvYXBpL2NvdXJzZXMvKiBnbyB0byBSdXN0XG4gICAgICAgICcvYXBpL2NvdXJzZXMvZGFzaGJvYXJkJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvY2FtZXJhJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfTkVYVEpTX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hcGkvbWVkaWFwaXBlLXdhc20nOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9ORVhUSlNfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICB9LFxuICAgICAgICAnL21vZGVscyc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX05FWFRKU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgIC8vIFx1MjUwMFx1MjUwMCBSdXN0IGFlcm8tYmFja2VuZCBjYXRjaC1hbGwgKHBvcnQgODA5MCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfUlVTVF9CQUNLRU5EX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDkwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9zb2NrZXQuaW8nOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9XU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MCcsXG4gICAgICAgICAgd3M6IHRydWUsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gQnVpbGQgb3B0aW1pemF0aW9uc1xuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgICAvLyBFeGNsdWRlIG1lZGlhcGlwZSBmcm9tIGJ1bmRsZSBcdTIwMTQgbG9hZGVkIHZpYSBDRE4gb3Igbm90IG5lZWRlZCBhdCBydW50aW1lXG4gICAgICAgICAgLy8gVW5jb21tZW50IGlmIHN0aWxsIGNhdXNpbmcgaXNzdWVzIGFmdGVyIGFsaWFzIGZpeDpcbiAgICAgICAgICAvLyAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nLFxuICAgICAgICBdLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknLCAnYXhpb3MnXSxcbiAgICAgICAgICAgICdyYWRpeC12ZW5kb3InOiBbXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWF2YXRhcicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgLy8gM0QgbGlicmFyaWVzIFx1MjAxNCBsYXp5IGxvYWRlZCBzbyBvbmx5IHB1bGxlZCB3aGVuIHZpc2l0aW5nIGxhYiBwYWdlc1xuICAgICAgICAgICAgJ3RocmVlLXZlbmRvcic6IFsndGhyZWUnLCAnQHJlYWN0LXRocmVlL2ZpYmVyJywgJ0ByZWFjdC10aHJlZS9kcmVpJ10sXG4gICAgICAgICAgICAnY2hhcnQtdmVuZG9yJzogWydyZWNoYXJ0cyddLFxuICAgICAgICAgICAgJ2Zvcm0tdmVuZG9yJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcbiAgICAgICAgICAgICdzdGF0ZS12ZW5kb3InOiBbJ3p1c3RhbmQnXSxcbiAgICAgICAgICAgIC8vIHNvY2tldC5pby1jbGllbnQgXHUyMDE0IGNoXHUxRUM5IGxvYWQga2hpIHZcdTAwRTBvIENoYXQgLyBPbmxpbmVFeGFtUm9vbSAobGF6eSlcbiAgICAgICAgICAgICdzb2NrZXQtdmVuZG9yJzogWydzb2NrZXQuaW8tY2xpZW50J10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsXG4gICAgfSxcblxuICAgIC8vIE9wdGltaXplIGRlcHMgcHJlLWJ1bmRsaW5nXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdyZWFjdCcsXG4gICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAnYXhpb3MnLFxuICAgICAgICAnenVzdGFuZCcsXG4gICAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgXSxcbiAgICAgIGV4Y2x1ZGU6IFtcbiAgICAgICAgJ3RocmVlJyxcbiAgICAgICAgJ0ByZWFjdC10aHJlZS9maWJlcicsXG4gICAgICAgICdAcmVhY3QtdGhyZWUvZHJlaScsXG4gICAgICAgICdAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbicsXG4gICAgICBdLFxuICAgIH0sXG4gIH1cbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQStXLFNBQVMsY0FBYyxlQUFlO0FBQ3JaLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyxrQkFBa0I7QUFIM0IsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENB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
