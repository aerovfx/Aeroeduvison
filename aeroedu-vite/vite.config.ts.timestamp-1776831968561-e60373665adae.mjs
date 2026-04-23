// vite.config.ts
import { defineConfig, loadEnv } from "file:///sessions/adoring-determined-galileo/mnt/Aeroeduvison/aeroedu-vite/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/adoring-determined-galileo/mnt/Aeroeduvison/aeroedu-vite/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///sessions/adoring-determined-galileo/mnt/Aeroeduvison/aeroedu-vite/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import viteCompression from "file:///sessions/adoring-determined-galileo/mnt/Aeroeduvison/aeroedu-vite/node_modules/vite-plugin-compression/dist/index.mjs";
var __vite_injected_original_dirname = "/sessions/adoring-determined-galileo/mnt/Aeroeduvison/aeroedu-vite";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      // Bundle analyzer — chạy: npm run build để xem stats.html
      visualizer({ open: false, filename: "stats.html" }),
      // Pre-compress build output — nginx sẽ serve trực tiếp .gz / .br
      // → giảm ~70% kích thước transfer cho three-vendor / chart-vendor
      viteCompression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 1024,
        deleteOriginFile: false
      }),
      viteCompression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 1024,
        deleteOriginFile: false
      })
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
            return !dep.includes("three-vendor") && !dep.includes("chart-vendor") && !dep.includes("socket-vendor") && // Các icon chunk nhỏ của lucide-react cũng không cần preload
            // (trình duyệt sẽ request khi Landing mount)
            !/\/(atom|trending-up|bar-chart-3|play|menu|star|layers|x)-[A-Za-z0-9_-]+\.js$/.test(dep);
          });
        }
      },
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
      chunkSizeWarningLimit: 1500,
      // CSS code-split: tách CSS theo chunk để file CSS chính không quá to
      cssCodeSplit: true
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvYWRvcmluZy1kZXRlcm1pbmVkLWdhbGlsZW8vbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9hZG9yaW5nLWRldGVybWluZWQtZ2FsaWxlby9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvYWRvcmluZy1kZXRlcm1pbmVkLWdhbGlsZW8vbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5pbXBvcnQgdml0ZUNvbXByZXNzaW9uIGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJ1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICAvLyBMb2FkIC5lbnYgLyAuZW52LnByb2R1Y3Rpb24gdlx1MDBFMG8gcHJvY2Vzcy5lbnYgXHUwMTExXHUxRUMzIGRcdTAwRjluZyB0cm9uZyBjb25maWcgblx1MDBFMHlcbiAgLy8gS0hcdTAwRDRORyBkXHUwMEY5bmcgcHJvY2Vzcy5lbnYuVklURV8qIHRyXHUxRUYxYyB0aVx1MUVCRnAgXHUyMDE0IHBoXHUxRUEzaSBxdWEgbG9hZEVudigpXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgJycpXG5cbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbXG4gICAgICByZWFjdCgpLFxuICAgICAgLy8gQnVuZGxlIGFuYWx5emVyIFx1MjAxNCBjaFx1MUVBMXk6IG5wbSBydW4gYnVpbGQgXHUwMTExXHUxRUMzIHhlbSBzdGF0cy5odG1sXG4gICAgICB2aXN1YWxpemVyKHsgb3BlbjogZmFsc2UsIGZpbGVuYW1lOiAnc3RhdHMuaHRtbCcgfSksXG4gICAgICAvLyBQcmUtY29tcHJlc3MgYnVpbGQgb3V0cHV0IFx1MjAxNCBuZ2lueCBzXHUxRUJEIHNlcnZlIHRyXHUxRUYxYyB0aVx1MUVCRnAgLmd6IC8gLmJyXG4gICAgICAvLyBcdTIxOTIgZ2lcdTFFQTNtIH43MCUga1x1MDBFRGNoIHRoXHUwMUIwXHUxRURCYyB0cmFuc2ZlciBjaG8gdGhyZWUtdmVuZG9yIC8gY2hhcnQtdmVuZG9yXG4gICAgICB2aXRlQ29tcHJlc3Npb24oe1xuICAgICAgICBhbGdvcml0aG06ICdnemlwJyxcbiAgICAgICAgZXh0OiAnLmd6JyxcbiAgICAgICAgdGhyZXNob2xkOiAxMDI0LFxuICAgICAgICBkZWxldGVPcmlnaW5GaWxlOiBmYWxzZSxcbiAgICAgIH0pLFxuICAgICAgdml0ZUNvbXByZXNzaW9uKHtcbiAgICAgICAgYWxnb3JpdGhtOiAnYnJvdGxpQ29tcHJlc3MnLFxuICAgICAgICBleHQ6ICcuYnInLFxuICAgICAgICB0aHJlc2hvbGQ6IDEwMjQsXG4gICAgICAgIGRlbGV0ZU9yaWdpbkZpbGU6IGZhbHNlLFxuICAgICAgfSksXG4gICAgXSxcblxuICAgIHJlc29sdmU6IHtcbiAgICAgIC8vIERlZHVwZSBSZWFjdCBzbyBldmVyeSBkZXAgKGluY2x1ZGluZyBAcmVhY3QtdGhyZWUvZmliZXIpIHVzZXMgdGhlIGV4YWN0XG4gICAgICAvLyBzYW1lIG1vZHVsZSBpbnN0YW5jZSBcdTIwMTQgcHJldmVudHMgdGhlIGR1YWwtcmVjb25jaWxlciBcInJlYWRpbmcgJ1MnXCIgY3Jhc2guXG4gICAgICBkZWR1cGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICBhbGlhczoge1xuICAgICAgICAvLyBHaVx1MUVFRiBuZ3V5XHUwMEVBbiBhbGlhcyAnQC8nIG5oXHUwMUIwIE5leHQuanMgcHJvamVjdFxuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgICAvLyBGaXggQG1lZGlhcGlwZS90YXNrcy12aXNpb24gKHB1bGxlZCBpbiBieSBAcmVhY3QtdGhyZWUvZHJlaSkgXHUyMDE0IGRcdTAwRjluZyBDSlMgYnVuZGxlXG4gICAgICAgICdAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbic6IHBhdGgucmVzb2x2ZShcbiAgICAgICAgICBfX2Rpcm5hbWUsXG4gICAgICAgICAgJ25vZGVfbW9kdWxlcy9AbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbi92aXNpb25fYnVuZGxlLmNqcydcbiAgICAgICAgKSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIERldiBzZXJ2ZXIgcHJveHkgXHUyMTkyIFJ1c3QgYWVyby1iYWNrZW5kIChBUEkgR2F0ZXdheSBwb3J0IDgwOTApXG4gICAgLy9cbiAgICAvLyBSb3V0aW5nIG1hcCBcdTIwMTQgdFx1MUVBNXQgY1x1MUVBMyAvYXBpLyogXHUwMTExXHUxRUMxdSBxdWEgYWVyby1iYWNrZW5kOjgwOTAsIG5cdTAwRjMgcHJveHkgdGlcdTFFQkZwOlxuICAgIC8vICAgL2FwaS9hdXRoLyogICAgICAgICAgIFx1MjE5MiBhdXRoLXNlcnZpY2UgICAgICAgIDo4MDkyXG4gICAgLy8gICAvYXBpL2NvdXJzZXMvKiAgICAgICAgXHUyMTkyIGNvdXJzZS1zZXJ2aWNlICAgICAgOjgwOTNcbiAgICAvLyAgIC9hcGkvYWRtaW4vKiAgICAgICAgICBcdTIxOTIgYWRtaW4tc2VydmljZSAgICAgICA6ODA5NFxuICAgIC8vICAgL2FwaS9zdHVkZW50cy8qICAgICAgIFx1MjE5MiBzdHVkZW50LXNlcnZpY2UgICAgIDo4MDk1XG4gICAgLy8gICAvYXBpL2NsYXNzZXMvKiAgICAgICAgXHUyMTkyIHN0dWRlbnQtc2VydmljZSAgICAgOjgwOTVcbiAgICAvLyAgIC9hcGkvYW5hbHl0aWNzLyogICAgICBcdTIxOTIgYW5hbHl0aWNzLXNlcnZpY2UgICA6ODEwNFxuICAgIC8vICAgL2FwaS9hc3NpZ25tZW50cy8qICAgIFx1MjE5MiBhc3NpZ25tZW50cy1zZXJ2aWNlIDo4MTAyXG4gICAgLy8gICAvYXBpL2FjaGlldmVtZW50cy8qICAgXHUyMTkyIGFjaGlldmVtZW50cy1zZXJ2aWNlOjgxMDNcbiAgICAvLyAgIC9hcGkvY2hhdC8qICAgICAgICAgICBcdTIxOTIgY2hhdC1zZXJ2aWNlICAgICAgICA6ODEwMVxuICAgIC8vICAgL2FwaS9lbW90aW9uLyogICAgICAgIFx1MjE5MiBlbW90aW9uLXNlcnZpY2UgICAgIDo4MTA1XG4gICAgLy8gICAvYXBpL2dyYWRpbmcvKiAgICAgICAgXHUyMTkyIGdyYWRpbmctc2VydmljZSAgICAgOjgxMDBcbiAgICAvLyAgIC9hcGkvZG9jdW1lbnRzLyogICAgICBcdTIxOTIgbWVkaWEtc2VydmljZSAgICAgICA6ODA5OFxuICAgIC8vICAgL2FwaS9xdWVzdGlvbi1iYW5rLyogIFx1MjE5MiBtZWRpYS1zZXJ2aWNlICAgICAgIDo4MDk4XG4gICAgLy8gICAvYXBpL3F1ZXN0aW9ucy8qICAgICAgXHUyMTkyIG1lZGlhLXNlcnZpY2UgICAgICAgOjgwOThcbiAgICAvLyAgIC9hcGkvZXhhbS1tYXRyaWNlcy8qICBcdTIxOTIgbWVkaWEtc2VydmljZSAgICAgICA6ODA5OFxuICAgIC8vICAgL2FwaS9leGFtcy8qICAgICAgICAgIFx1MjE5MiBtZWRpYS1zZXJ2aWNlICAgICAgIDo4MDk4XG4gICAgLy8gICAvYXBpL2NhbWVyYS8qICAgICAgICAgXHUyMTkyIGNhbWVyYS1pb3Qtc2VydmljZSAgOjgwOTlcbiAgICAvLyAgIC9hcGkvaW90LyogICAgICAgICAgICBcdTIxOTIgY2FtZXJhLWlvdC1zZXJ2aWNlICA6ODA5OVxuICAgIC8vICAgL2FwaS9zdGVtLyogICAgICAgICAgIFx1MjE5MiBzdGVtLXNlcnZpY2UgICAgICAgIDo4MDk3XG4gICAgLy8gICAvYXBpL2FpKiAgICAgICAgICAgICAgXHUyMTkyIGFpLXNlcnZpY2UgICAgICAgICAgOjgwOTZcbiAgICAvLyAgIC9hcGkvdGVhY2hlci8qICAgICAgICBcdTIxOTIgdGVhY2hlci1zZXJ2aWNlICAgICA6ODEwNlxuICAgIC8vICAgL2FwaS9vbmxpbmUtZXhhbS1yb29tIFx1MjE5MiBleGFtLXNlcnZpY2UgICAgICAgIDo4MTA3XG4gICAgLy8gICAvYXBpL3RyYW5zY3JpcHQvKiAgICAgXHUyMTkyIHRyYW5zY3JpcHQtc2VydmljZSAgOjgxMDhcbiAgICAvLyAgIC9hcGkvbGF0ZXgtcHJvamVjdHMvKiBcdTIxOTIgbGF0ZXgtc2VydmljZSAgICAgICA6ODEwOVxuICAgIC8vICAgL2FwaS92aXNpb24tdHJhY2tlci8qIFx1MjE5MiBlbW90aW9uLXNlcnZpY2UgICAgIDo4MTA1IChwYXRoIHJld3JpdGUgKyBzdHVicylcbiAgICAvLyAgIC9hcGkvdXNlcnMgICAgICAgICAgICBcdTIxOTIgc3R1ZGVudC1zZXJ2aWNlICAgICA6ODA5NVxuICAgIC8vICAgL2FwaS9zdHVkZW50LyogICAgICAgIFx1MjE5MiBzdHVkZW50LXNlcnZpY2UgICAgIDo4MDk1XG4gICAgLy9cbiAgICAvLyBcdTI3MDUgTmV4dC5qcyBcdTAxMTFcdTAwRTMgeFx1MDBGM2EgaG9cdTAwRTBuIHRvXHUwMEUwbiBcdTIwMTQgMTAwJSBBUEkgcXVhIFJ1c3QgYWVyby1iYWNrZW5kOlxuICAgIC8vICAgL2FwaS92aXNpb24tdHJhY2tlciAgXHUyMTkyIGFlcm8tYmFja2VuZCBcdTIxOTIgZW1vdGlvbi1zZXJ2aWNlIDo4MTA1IChwYXRoIHJld3JpdGUgKyBzdHVicylcbiAgICAvLyAgIC9hcGkvdXNlcnMgICAgICAgICAgIFx1MjE5MiBhZXJvLWJhY2tlbmQgXHUyMTkyIHN0dWRlbnQtc2VydmljZSA6ODA5NVxuICAgIC8vICAgL2FwaS9zdHVkZW50ICAgICAgICAgXHUyMTkyIGFlcm8tYmFja2VuZCBcdTIxOTIgc3R1ZGVudC1zZXJ2aWNlIDo4MDk1XG4gICAgLy8gICAvbWVkaWFwaXBlLXdhc20vKiAgICBcdTIxOTIgVml0ZSBwdWJsaWMvIHN0YXRpYyAoa2hcdTAwRjRuZyBjXHUxRUE3biBwcm94eSlcbiAgICAvLyAgIC9tb2RlbHMvKiAgICAgICAgICAgIFx1MjE5MiBWaXRlIHB1YmxpYy8gc3RhdGljIChraFx1MDBGNG5nIGNcdTFFQTduIHByb3h5KVxuICAgIHNlcnZlcjoge1xuICAgICAgcG9ydDogNTE3MyxcbiAgICAgIHByb3h5OiB7XG4gICAgICAgIC8vIFx1MjUwMFx1MjUwMCBSdXN0IGFlcm8tYmFja2VuZCBjYXRjaC1hbGwgKHBvcnQgODA5MCkgXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXHUyNTAwXG4gICAgICAgIC8vIFRcdTFFQTV0IGNcdTFFQTMgL2FwaS8qIFx1MjE5MiBhZXJvLWJhY2tlbmQgcHJveGllcyBcdTAxMTFcdTFFQkZuIG1pY3Jvc2VydmljZXM6XG4gICAgICAgIC8vICAgYXV0aCwgY291cnNlcywgYWRtaW4sIGFuYWx5dGljcywgY2xhc3Nlcywgc3R1ZGVudHMsIGdyYWRpbmcsXG4gICAgICAgIC8vICAgZG9jdW1lbnRzLCBxdWVzdGlvbnMsIGV4YW0tbWF0cmljZXMsIGV4YW1zLCB1cGxvYWQsIGNhbWVyYSwgaW90LFxuICAgICAgICAvLyAgIHN0ZW0sIGFpKiwgY2hhdCwgZW1vdGlvbiwgYXNzaWdubWVudHMsIGFjaGlldmVtZW50cywgcXVlc3Rpb24tYmFuayxcbiAgICAgICAgLy8gICB2ZWN0b3Itc2ltaWxhcml0eSwgbGxtLWdyYWRpbmcsIHRlYWNoZXIsIG9ubGluZS1leGFtLXJvb20sXG4gICAgICAgIC8vICAgdHJhbnNjcmlwdCwgbGF0ZXgtcHJvamVjdHMsIHZpc2lvbi10cmFja2VyLCB1c2Vycywgc3R1ZGVudFxuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX1JVU1RfQkFDS0VORF9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODA5MCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfV1NfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwOTAnLFxuICAgICAgICAgIHdzOiB0cnVlLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEJ1aWxkIG9wdGltaXphdGlvbnNcbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgICAvLyBcdTI2QTBcdUZFMEYgIFF1YW4gdHJcdTFFQ0RuZzogZmlsdGVyIG1vZHVsZXByZWxvYWQgXHUwMTExXHUxRUMzIEtIXHUwMEQ0TkcgcHJlbG9hZCB0aHJlZS12ZW5kb3IgL1xuICAgICAgLy8gY2hhcnQtdmVuZG9yIC8gc29ja2V0LXZlbmRvciB0clx1MDBFQW4gbGFuZGluZyBwYWdlLiBDXHUwMEUxYyBjaHVuayBuXHUwMEUweSBjaFx1MUVDOSBcdTAxMTFcdTAxQjBcdTFFRTNjXG4gICAgICAvLyB0XHUxRUEzaSBraGkgdXNlciB2XHUwMEUwbyAvbGFicywgL2Rhc2hib2FyZC9hbmFseXRpY3MsIC9jaGF0IFx1MjAyNiBcdTIwMTQgdFx1MUVFOWMgbFx1MDBFMCBkeW5hbWljXG4gICAgICAvLyBpbXBvcnQuIE5cdTFFQkZ1IGtoXHUwMEY0bmcgZmlsdGVyLCBWaXRlIG1cdTFFQjdjIFx1MDExMVx1MUVDQm5oIHNcdTFFQkQgZW1pdCA8bGluayByZWw9XCJtb2R1bGVwcmVsb2FkXCI+XG4gICAgICAvLyBjaG8gVFx1MUVBNFQgQ1x1MUVBMiBjaHVuayB0cm9uZyBncmFwaCwga1x1MDBFOW8gfjEuNSBNQiBKUyBraFx1MDBGNG5nIGNcdTFFQTduIHRoaVx1MUVCRnQgbmdheSBsXHUwMEZBY1xuICAgICAgLy8gXHUwMTExXHUxRUE3dSB0aVx1MDBFQW4gdlx1MDBFMCBcdTAxMTFcdTFFQTl5IEZDUCB0XHUxRUVCIH41cyB4dVx1MUVEMW5nIFx1MDExMVx1MDBFMW5nIGtcdTFFQzMga2hpIGJcdTFFQ0YuXG4gICAgICBtb2R1bGVQcmVsb2FkOiB7XG4gICAgICAgIHBvbHlmaWxsOiB0cnVlLFxuICAgICAgICByZXNvbHZlRGVwZW5kZW5jaWVzOiAoX2ZpbGVuYW1lLCBkZXBzKSA9PiB7XG4gICAgICAgICAgcmV0dXJuIGRlcHMuZmlsdGVyKChkZXApID0+IHtcbiAgICAgICAgICAgIHJldHVybiAoXG4gICAgICAgICAgICAgICFkZXAuaW5jbHVkZXMoJ3RocmVlLXZlbmRvcicpICYmXG4gICAgICAgICAgICAgICFkZXAuaW5jbHVkZXMoJ2NoYXJ0LXZlbmRvcicpICYmXG4gICAgICAgICAgICAgICFkZXAuaW5jbHVkZXMoJ3NvY2tldC12ZW5kb3InKSAmJlxuICAgICAgICAgICAgICAvLyBDXHUwMEUxYyBpY29uIGNodW5rIG5oXHUxRUNGIGNcdTFFRTdhIGx1Y2lkZS1yZWFjdCBjXHUwMTY5bmcga2hcdTAwRjRuZyBjXHUxRUE3biBwcmVsb2FkXG4gICAgICAgICAgICAgIC8vICh0clx1MDBFQ25oIGR1eVx1MUVDN3Qgc1x1MUVCRCByZXF1ZXN0IGtoaSBMYW5kaW5nIG1vdW50KVxuICAgICAgICAgICAgICAhL1xcLyhhdG9tfHRyZW5kaW5nLXVwfGJhci1jaGFydC0zfHBsYXl8bWVudXxzdGFyfGxheWVyc3x4KS1bQS1aYS16MC05Xy1dK1xcLmpzJC8udGVzdChkZXApXG4gICAgICAgICAgICApXG4gICAgICAgICAgfSlcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgICAgLy8gRXhjbHVkZSBtZWRpYXBpcGUgZnJvbSBidW5kbGUgXHUyMDE0IGxvYWRlZCB2aWEgQ0ROIG9yIG5vdCBuZWVkZWQgYXQgcnVudGltZVxuICAgICAgICAgIC8vIFVuY29tbWVudCBpZiBzdGlsbCBjYXVzaW5nIGlzc3VlcyBhZnRlciBhbGlhcyBmaXg6XG4gICAgICAgICAgLy8gJ0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uJyxcbiAgICAgICAgXSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICAgJ3F1ZXJ5LXZlbmRvcic6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JywgJ2F4aW9zJ10sXG4gICAgICAgICAgICAncmFkaXgtdmVuZG9yJzogW1xuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1hdmF0YXInLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8vIDNEIGxpYnJhcmllcyBcdTIwMTQgbGF6eSBsb2FkZWQgc28gb25seSBwdWxsZWQgd2hlbiB2aXNpdGluZyBsYWIgcGFnZXNcbiAgICAgICAgICAgICd0aHJlZS12ZW5kb3InOiBbJ3RocmVlJywgJ0ByZWFjdC10aHJlZS9maWJlcicsICdAcmVhY3QtdGhyZWUvZHJlaSddLFxuICAgICAgICAgICAgJ2NoYXJ0LXZlbmRvcic6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXG4gICAgICAgICAgICAnc3RhdGUtdmVuZG9yJzogWyd6dXN0YW5kJ10sXG4gICAgICAgICAgICAvLyBzb2NrZXQuaW8tY2xpZW50IFx1MjAxNCBjaFx1MUVDOSBsb2FkIGtoaSB2XHUwMEUwbyBDaGF0IC8gT25saW5lRXhhbVJvb20gKGxhenkpXG4gICAgICAgICAgICAnc29ja2V0LXZlbmRvcic6IFsnc29ja2V0LmlvLWNsaWVudCddLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxNTAwLFxuICAgICAgLy8gQ1NTIGNvZGUtc3BsaXQ6IHRcdTAwRTFjaCBDU1MgdGhlbyBjaHVuayBcdTAxMTFcdTFFQzMgZmlsZSBDU1MgY2hcdTAwRURuaCBraFx1MDBGNG5nIHF1XHUwMEUxIHRvXG4gICAgICBjc3NDb2RlU3BsaXQ6IHRydWUsXG4gICAgfSxcblxuICAgIC8vIE9wdGltaXplIGRlcHMgcHJlLWJ1bmRsaW5nXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbXG4gICAgICAgICdyZWFjdCcsXG4gICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAgICdAdGFuc3RhY2svcmVhY3QtcXVlcnknLFxuICAgICAgICAnYXhpb3MnLFxuICAgICAgICAnenVzdGFuZCcsXG4gICAgICAgICdsdWNpZGUtcmVhY3QnLFxuICAgICAgICAvLyBSM0YgdjggZGVwcyB0aGF0IHNoaXAgYXMgQ0pTIGFuZCBuZWVkIEVTTSB3cmFwcGluZyBieSBWaXRlXG4gICAgICAgICd1c2Utc3luYy1leHRlcm5hbC1zdG9yZScsXG4gICAgICAgICd1c2Utc3luYy1leHRlcm5hbC1zdG9yZS9zaGltL3dpdGgtc2VsZWN0b3InLFxuICAgICAgICAncmVhY3QtcmVjb25jaWxlcicsXG4gICAgICAgICdyZWFjdC1yZWNvbmNpbGVyL2NvbnN0YW50cycsXG4gICAgICBdLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAvLyBtZWRpYXBpcGUgaGFzIGl0cyBvd24gQ0pTIGJ1bmRsZSB2aWEgYWxpYXMgXHUyMDE0IGtlZXAgZXhjbHVkZWRcbiAgICAgICAgJ0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uJyxcbiAgICAgIF0sXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd1gsU0FBUyxjQUFjLGVBQWU7QUFDOVosT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLHFCQUFxQjtBQUo1QixJQUFNLG1DQUFtQztBQU96QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUd4QyxRQUFNLE1BQU0sUUFBUSxNQUFNLFFBQVEsSUFBSSxHQUFHLEVBQUU7QUFFM0MsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBO0FBQUEsTUFFTixXQUFXLEVBQUUsTUFBTSxPQUFPLFVBQVUsYUFBYSxDQUFDO0FBQUE7QUFBQTtBQUFBLE1BR2xELGdCQUFnQjtBQUFBLFFBQ2QsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFBLFFBQ0wsV0FBVztBQUFBLFFBQ1gsa0JBQWtCO0FBQUEsTUFDcEIsQ0FBQztBQUFBLE1BQ0QsZ0JBQWdCO0FBQUEsUUFDZCxXQUFXO0FBQUEsUUFDWCxLQUFLO0FBQUEsUUFDTCxXQUFXO0FBQUEsUUFDWCxrQkFBa0I7QUFBQSxNQUNwQixDQUFDO0FBQUEs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
