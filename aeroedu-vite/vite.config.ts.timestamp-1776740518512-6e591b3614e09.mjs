// vite.config.ts
import { defineConfig, loadEnv } from "file:///sessions/focused-brave-ramanujan/mnt/Aeroeduvison/aeroedu-vite/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/focused-brave-ramanujan/mnt/Aeroeduvison/aeroedu-vite/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///sessions/focused-brave-ramanujan/mnt/Aeroeduvison/aeroedu-vite/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/sessions/focused-brave-ramanujan/mnt/Aeroeduvison/aeroedu-vite";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      // Bundle analyzer — chạy: npm run build để xem stats.html
      visualizer({ open: false, filename: "stats.html" })
    ],
    resolve: {
      // Dedupe React so every dep (including @react-three/fiber) uses the exact
      // same module instance — prevents the dual-reconciler "reading 'S'" crash.
      dedupe: ["react", "react-dom"],
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
        "lucide-react",
        // R3F v8 deps that ship as CJS and need ESM wrapping by Vite
        "use-sync-external-store",
        "use-sync-external-store/shim/with-selector",
        "react-reconciler",
        "react-reconciler/constants"
      ],
      exclude: [
        // mediapipe has its own CJS bundle via alias — keep excluded
        "@mediapipe/tasks-vision"
      ]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvZm9jdXNlZC1icmF2ZS1yYW1hbnVqYW4vbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9mb2N1c2VkLWJyYXZlLXJhbWFudWphbi9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvZm9jdXNlZC1icmF2ZS1yYW1hbnVqYW4vbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIExvYWQgLmVudiAvIC5lbnYucHJvZHVjdGlvbiB2XHUwMEUwbyBwcm9jZXNzLmVudiBcdTAxMTFcdTFFQzMgZFx1MDBGOW5nIHRyb25nIGNvbmZpZyBuXHUwMEUweVxuICAvLyBLSFx1MDBENE5HIGRcdTAwRjluZyBwcm9jZXNzLmVudi5WSVRFXyogdHJcdTFFRjFjIHRpXHUxRUJGcCBcdTIwMTQgcGhcdTFFQTNpIHF1YSBsb2FkRW52KClcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgXHUyMDE0IGNoXHUxRUExeTogbnBtIHJ1biBidWlsZCBcdTAxMTFcdTFFQzMgeGVtIHN0YXRzLmh0bWxcbiAgICAgIHZpc3VhbGl6ZXIoeyBvcGVuOiBmYWxzZSwgZmlsZW5hbWU6ICdzdGF0cy5odG1sJyB9KSxcbiAgICBdLFxuXG4gICAgcmVzb2x2ZToge1xuICAgICAgLy8gRGVkdXBlIFJlYWN0IHNvIGV2ZXJ5IGRlcCAoaW5jbHVkaW5nIEByZWFjdC10aHJlZS9maWJlcikgdXNlcyB0aGUgZXhhY3RcbiAgICAgIC8vIHNhbWUgbW9kdWxlIGluc3RhbmNlIFx1MjAxNCBwcmV2ZW50cyB0aGUgZHVhbC1yZWNvbmNpbGVyIFwicmVhZGluZyAnUydcIiBjcmFzaC5cbiAgICAgIGRlZHVwZTogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgIC8vIEdpXHUxRUVGIG5ndXlcdTAwRUFuIGFsaWFzICdALycgbmhcdTAxQjAgTmV4dC5qcyBwcm9qZWN0XG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICAgIC8vIEZpeCBAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbiAocHVsbGVkIGluIGJ5IEByZWFjdC10aHJlZS9kcmVpKSBcdTIwMTQgZFx1MDBGOW5nIENKUyBidW5kbGVcbiAgICAgICAgJ0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uJzogcGF0aC5yZXNvbHZlKFxuICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAnbm9kZV9tb2R1bGVzL0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uL3Zpc2lvbl9idW5kbGUuY2pzJ1xuICAgICAgICApLFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gRGV2IHNlcnZlciBwcm94eSBcdTIxOTIgUnVzdCBhZXJvLWJhY2tlbmQgKEFQSSBHYXRld2F5IHBvcnQgODA5MClcbiAgICAvL1xuICAgIC8vIFJvdXRpbmcgbWFwIFx1MjAxNCB0XHUxRUE1dCBjXHUxRUEzIC9hcGkvKiBcdTAxMTFcdTFFQzF1IHF1YSBhZXJvLWJhY2tlbmQ6ODA5MCwgblx1MDBGMyBwcm94eSB0aVx1MUVCRnA6XG4gICAgLy8gICAvYXBpL2F1dGgvKiAgICAgICAgICAgXHUyMTkyIGF1dGgtc2VydmljZSAgICAgICAgOjgwOTJcbiAgICAvLyAgIC9hcGkvY291cnNlcy8qICAgICAgICBcdTIxOTIgY291cnNlLXNlcnZpY2UgICAgICA6ODA5M1xuICAgIC8vICAgL2FwaS9hZG1pbi8qICAgICAgICAgIFx1MjE5MiBhZG1pbi1zZXJ2aWNlICAgICAgIDo4MDk0XG4gICAgLy8gICAvYXBpL3N0dWRlbnRzLyogICAgICAgXHUyMTkyIHN0dWRlbnQtc2VydmljZSAgICAgOjgwOTVcbiAgICAvLyAgIC9hcGkvY2xhc3Nlcy8qICAgICAgICBcdTIxOTIgc3R1ZGVudC1zZXJ2aWNlICAgICA6ODA5NVxuICAgIC8vICAgL2FwaS9hbmFseXRpY3MvKiAgICAgIFx1MjE5MiBhbmFseXRpY3Mtc2VydmljZSAgIDo4MTA0XG4gICAgLy8gICAvYXBpL2Fzc2lnbm1lbnRzLyogICAgXHUyMTkyIGFzc2lnbm1lbnRzLXNlcnZpY2UgOjgxMDJcbiAgICAvLyAgIC9hcGkvYWNoaWV2ZW1lbnRzLyogICBcdTIxOTIgYWNoaWV2ZW1lbnRzLXNlcnZpY2U6ODEwM1xuICAgIC8vICAgL2FwaS9jaGF0LyogICAgICAgICAgIFx1MjE5MiBjaGF0LXNlcnZpY2UgICAgICAgIDo4MTAxXG4gICAgLy8gICAvYXBpL2Vtb3Rpb24vKiAgICAgICAgXHUyMTkyIGVtb3Rpb24tc2VydmljZSAgICAgOjgxMDVcbiAgICAvLyAgIC9hcGkvZ3JhZGluZy8qICAgICAgICBcdTIxOTIgZ3JhZGluZy1zZXJ2aWNlICAgICA6ODEwMFxuICAgIC8vICAgL2FwaS9kb2N1bWVudHMvKiAgICAgIFx1MjE5MiBtZWRpYS1zZXJ2aWNlICAgICAgIDo4MDk4XG4gICAgLy8gICAvYXBpL3F1ZXN0aW9uLWJhbmsvKiAgXHUyMTkyIG1lZGlhLXNlcnZpY2UgICAgICAgOjgwOThcbiAgICAvLyAgIC9hcGkvcXVlc3Rpb25zLyogICAgICBcdTIxOTIgbWVkaWEtc2VydmljZSAgICAgICA6ODA5OFxuICAgIC8vICAgL2FwaS9leGFtLW1hdHJpY2VzLyogIFx1MjE5MiBtZWRpYS1zZXJ2aWNlICAgICAgIDo4MDk4XG4gICAgLy8gICAvYXBpL2V4YW1zLyogICAgICAgICAgXHUyMTkyIG1lZGlhLXNlcnZpY2UgICAgICAgOjgwOThcbiAgICAvLyAgIC9hcGkvY2FtZXJhLyogICAgICAgICBcdTIxOTIgY2FtZXJhLWlvdC1zZXJ2aWNlICA6ODA5OVxuICAgIC8vICAgL2FwaS9pb3QvKiAgICAgICAgICAgIFx1MjE5MiBjYW1lcmEtaW90LXNlcnZpY2UgIDo4MDk5XG4gICAgLy8gICAvYXBpL3N0ZW0vKiAgICAgICAgICAgXHUyMTkyIHN0ZW0tc2VydmljZSAgICAgICAgOjgwOTdcbiAgICAvLyAgIC9hcGkvYWkqICAgICAgICAgICAgICBcdTIxOTIgYWktc2VydmljZSAgICAgICAgICA6ODA5NlxuICAgIC8vICAgL2FwaS90ZWFjaGVyLyogICAgICAgIFx1MjE5MiB0ZWFjaGVyLXNlcnZpY2UgICAgIDo4MTA2XG4gICAgLy8gICAvYXBpL29ubGluZS1leGFtLXJvb20gXHUyMTkyIGV4YW0tc2VydmljZSAgICAgICAgOjgxMDdcbiAgICAvLyAgIC9hcGkvdHJhbnNjcmlwdC8qICAgICBcdTIxOTIgdHJhbnNjcmlwdC1zZXJ2aWNlICA6ODEwOFxuICAgIC8vICAgL2FwaS9sYXRleC1wcm9qZWN0cy8qIFx1MjE5MiBsYXRleC1zZXJ2aWNlICAgICAgIDo4MTA5XG4gICAgLy8gICAvYXBpL3Zpc2lvbi10cmFja2VyLyogXHUyMTkyIGVtb3Rpb24tc2VydmljZSAgICAgOjgxMDUgKHBhdGggcmV3cml0ZSArIHN0dWJzKVxuICAgIC8vICAgL2FwaS91c2VycyAgICAgICAgICAgIFx1MjE5MiBzdHVkZW50LXNlcnZpY2UgICAgIDo4MDk1XG4gICAgLy8gICAvYXBpL3N0dWRlbnQvKiAgICAgICAgXHUyMTkyIHN0dWRlbnQtc2VydmljZSAgICAgOjgwOTVcbiAgICAvL1xuICAgIC8vIFx1MjcwNSBOZXh0LmpzIFx1MDExMVx1MDBFMyB4XHUwMEYzYSBob1x1MDBFMG4gdG9cdTAwRTBuIFx1MjAxNCAxMDAlIEFQSSBxdWEgUnVzdCBhZXJvLWJhY2tlbmQ6XG4gICAgLy8gICAvYXBpL3Zpc2lvbi10cmFja2VyICBcdTIxOTIgYWVyby1iYWNrZW5kIFx1MjE5MiBlbW90aW9uLXNlcnZpY2UgOjgxMDUgKHBhdGggcmV3cml0ZSArIHN0dWJzKVxuICAgIC8vICAgL2FwaS91c2VycyAgICAgICAgICAgXHUyMTkyIGFlcm8tYmFja2VuZCBcdTIxOTIgc3R1ZGVudC1zZXJ2aWNlIDo4MDk1XG4gICAgLy8gICAvYXBpL3N0dWRlbnQgICAgICAgICBcdTIxOTIgYWVyby1iYWNrZW5kIFx1MjE5MiBzdHVkZW50LXNlcnZpY2UgOjgwOTVcbiAgICAvLyAgIC9tZWRpYXBpcGUtd2FzbS8qICAgIFx1MjE5MiBWaXRlIHB1YmxpYy8gc3RhdGljIChraFx1MDBGNG5nIGNcdTFFQTduIHByb3h5KVxuICAgIC8vICAgL21vZGVscy8qICAgICAgICAgICAgXHUyMTkyIFZpdGUgcHVibGljLyBzdGF0aWMgKGtoXHUwMEY0bmcgY1x1MUVBN24gcHJveHkpXG4gICAgc2VydmVyOiB7XG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgLy8gXHUyNTAwXHUyNTAwIFJ1c3QgYWVyby1iYWNrZW5kIGNhdGNoLWFsbCAocG9ydCA4MDkwKSBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcdTI1MDBcbiAgICAgICAgLy8gVFx1MUVBNXQgY1x1MUVBMyAvYXBpLyogXHUyMTkyIGFlcm8tYmFja2VuZCBwcm94aWVzIFx1MDExMVx1MUVCRm4gbWljcm9zZXJ2aWNlczpcbiAgICAgICAgLy8gICBhdXRoLCBjb3Vyc2VzLCBhZG1pbiwgYW5hbHl0aWNzLCBjbGFzc2VzLCBzdHVkZW50cywgZ3JhZGluZyxcbiAgICAgICAgLy8gICBkb2N1bWVudHMsIHF1ZXN0aW9ucywgZXhhbS1tYXRyaWNlcywgZXhhbXMsIHVwbG9hZCwgY2FtZXJhLCBpb3QsXG4gICAgICAgIC8vICAgc3RlbSwgYWkqLCBjaGF0LCBlbW90aW9uLCBhc3NpZ25tZW50cywgYWNoaWV2ZW1lbnRzLCBxdWVzdGlvbi1iYW5rLFxuICAgICAgICAvLyAgIHZlY3Rvci1zaW1pbGFyaXR5LCBsbG0tZ3JhZGluZywgdGVhY2hlciwgb25saW5lLWV4YW0tcm9vbSxcbiAgICAgICAgLy8gICB0cmFuc2NyaXB0LCBsYXRleC1wcm9qZWN0cywgdmlzaW9uLXRyYWNrZXIsIHVzZXJzLCBzdHVkZW50XG4gICAgICAgICcvYXBpJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfUlVTVF9CQUNLRU5EX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDkwJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9zb2NrZXQuaW8nOiB7XG4gICAgICAgICAgdGFyZ2V0OiBlbnYuVklURV9XU19VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MCcsXG4gICAgICAgICAgd3M6IHRydWUsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuXG4gICAgLy8gQnVpbGQgb3B0aW1pemF0aW9uc1xuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgICAgc291cmNlbWFwOiBmYWxzZSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgICAvLyBFeGNsdWRlIG1lZGlhcGlwZSBmcm9tIGJ1bmRsZSBcdTIwMTQgbG9hZGVkIHZpYSBDRE4gb3Igbm90IG5lZWRlZCBhdCBydW50aW1lXG4gICAgICAgICAgLy8gVW5jb21tZW50IGlmIHN0aWxsIGNhdXNpbmcgaXNzdWVzIGFmdGVyIGFsaWFzIGZpeDpcbiAgICAgICAgICAvLyAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nLFxuICAgICAgICBdLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAgICdyZWFjdC12ZW5kb3InOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknLCAnYXhpb3MnXSxcbiAgICAgICAgICAgICdyYWRpeC12ZW5kb3InOiBbXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kcm9wZG93bi1tZW51JyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWF2YXRhcicsXG4gICAgICAgICAgICBdLFxuICAgICAgICAgICAgLy8gM0QgbGlicmFyaWVzIFx1MjAxNCBsYXp5IGxvYWRlZCBzbyBvbmx5IHB1bGxlZCB3aGVuIHZpc2l0aW5nIGxhYiBwYWdlc1xuICAgICAgICAgICAgJ3RocmVlLXZlbmRvcic6IFsndGhyZWUnLCAnQHJlYWN0LXRocmVlL2ZpYmVyJywgJ0ByZWFjdC10aHJlZS9kcmVpJ10sXG4gICAgICAgICAgICAnY2hhcnQtdmVuZG9yJzogWydyZWNoYXJ0cyddLFxuICAgICAgICAgICAgJ2Zvcm0tdmVuZG9yJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcbiAgICAgICAgICAgICdzdGF0ZS12ZW5kb3InOiBbJ3p1c3RhbmQnXSxcbiAgICAgICAgICAgIC8vIHNvY2tldC5pby1jbGllbnQgXHUyMDE0IGNoXHUxRUM5IGxvYWQga2hpIHZcdTAwRTBvIENoYXQgLyBPbmxpbmVFeGFtUm9vbSAobGF6eSlcbiAgICAgICAgICAgICdzb2NrZXQtdmVuZG9yJzogWydzb2NrZXQuaW8tY2xpZW50J10sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDE1MDAsXG4gICAgfSxcblxuICAgIC8vIE9wdGltaXplIGRlcHMgcHJlLWJ1bmRsaW5nXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdyZWFjdCcsXG4gICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAnYXhpb3MnLFxuICAgICAgICAnenVzdGFuZCcsXG4gICAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgICAvLyBSM0YgdjggZGVwcyB0aGF0IHNoaXAgYXMgQ0pTIGFuZCBuZWVkIEVTTSB3cmFwcGluZyBieSBWaXRlXG4gICAgICAgICd1c2Utc3luYy1leHRlcm5hbC1zdG9yZScsXG4gICAgICAgICd1c2Utc3luYy1leHRlcm5hbC1zdG9yZS9zaGltL3dpdGgtc2VsZWN0b3InLFxuICAgICAgICAncmVhY3QtcmVjb25jaWxlcicsXG4gICAgICAgICdyZWFjdC1yZWNvbmNpbGVyL2NvbnN0YW50cycsXG4gICAgICBdLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAvLyBtZWRpYXBpcGUgaGFzIGl0cyBvd24gQ0pTIGJ1bmRsZSB2aWEgYWxpYXMgXHUyMDE0IGtlZXAgZXhjbHVkZWRcbiAgICAgICAgJ0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1csU0FBUyxjQUFjLGVBQWU7QUFDclosT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGtCQUFrQjtBQUgzQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUd4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBO0FBQUEsTUFFTixXQUFXLEVBQUUsTUFBTSxPQUFPLFVBQVUsYUFBYSxDQUFDO0FBQUEsSUFDcEQ7QUFBQSxJQUVBLFNBQVM7QUFBQTtBQUFBO0FBQUEsTUFHUCxRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsTUFDN0IsT0FBTztBQUFBO0FBQUEsUUFFTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUE7QUFBQSxRQUVwQywyQkFBMkIsS0FBSztBQUFBLFVBQzlCO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUF1Q0EsUUFBUTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFRTCxRQUFRO0FBQUEsVUFDTixRQUFRLElBQUkseUJBQXlCO0FBQUEsVUFDckMsY0FBYztBQUFBLFVBQ2QsUUFBUTtBQUFBLFFBQ1Y7QUFBQSxRQUNBLGNBQWM7QUFBQSxVQUNaLFFBQVEsSUFBSSxlQUFlO0FBQUEsVUFDM0IsSUFBSTtBQUFBLFVBQ0osY0FBYztBQUFBLFFBQ2hCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBR0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsV0FBVztBQUFBLE1BQ1gsZUFBZTtBQUFBLFFBQ2IsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSVY7QUFBQSxRQUNBLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxZQUN6RCxnQkFBZ0IsQ0FBQyx5QkFBeUIsT0FBTztBQUFBLFlBQ2pELGdCQUFnQjtBQUFBLGNBQ2Q7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsWUFDRjtBQUFBO0FBQUEsWUFFQSxnQkFBZ0IsQ0FBQyxTQUFTLHNCQUFzQixtQkFBbUI7QUFBQSxZQUNuRSxnQkFBZ0IsQ0FBQyxVQUFVO0FBQUEsWUFDM0IsZUFBZSxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFlBQy9ELGdCQUFnQixDQUFDLFNBQVM7QUFBQTtBQUFBLFlBRTFCLGlCQUFpQixDQUFDLGtCQUFrQjtBQUFBLFVBQ3RDO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLHVCQUF1QjtBQUFBLElBQ3pCO0FBQUE7QUFBQSxJQUdBLGNBQWM7QUFBQSxNQUNaLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUE7QUFBQSxRQUVBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsU0FBUztBQUFBO0FBQUEsUUFFUDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
