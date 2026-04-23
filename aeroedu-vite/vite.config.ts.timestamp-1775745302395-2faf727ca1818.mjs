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
    // Dev server proxy → Next.js backend (hoặc Rust aero-backend)
    server: {
      port: 3001,
      proxy: {
        "/api": {
          // Đọc từ .env đã load — fallback về Next.js dev server
          target: env.VITE_API_URL || "http://localhost:3000",
          changeOrigin: true,
          secure: false
        },
        "/socket.io": {
          target: env.VITE_WS_URL || "http://localhost:3000",
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9zd2VldC1jb25maWRlbnQtbWVpdG5lci9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIGxvYWRFbnYgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIC8vIExvYWQgLmVudiAvIC5lbnYucHJvZHVjdGlvbiB2XHUwMEUwbyBwcm9jZXNzLmVudiBcdTAxMTFcdTFFQzMgZFx1MDBGOW5nIHRyb25nIGNvbmZpZyBuXHUwMEUweVxuICAvLyBLSFx1MDBENE5HIGRcdTAwRjluZyBwcm9jZXNzLmVudi5WSVRFXyogdHJcdTFFRjFjIHRpXHUxRUJGcCBcdTIwMTQgcGhcdTFFQTNpIHF1YSBsb2FkRW52KClcbiAgY29uc3QgZW52ID0gbG9hZEVudihtb2RlLCBwcm9jZXNzLmN3ZCgpLCAnJylcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgXHUyMDE0IGNoXHUxRUExeTogbnBtIHJ1biBidWlsZCBcdTAxMTFcdTFFQzMgeGVtIHN0YXRzLmh0bWxcbiAgICAgIHZpc3VhbGl6ZXIoeyBvcGVuOiBmYWxzZSwgZmlsZW5hbWU6ICdzdGF0cy5odG1sJyB9KSxcbiAgICBdLFxuXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgLy8gR2lcdTFFRUYgbmd1eVx1MDBFQW4gYWxpYXMgJ0AvJyBuaFx1MDFCMCBOZXh0LmpzIHByb2plY3RcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLy8gRml4IEBtZWRpYXBpcGUvdGFza3MtdmlzaW9uIChwdWxsZWQgaW4gYnkgQHJlYWN0LXRocmVlL2RyZWkpIFx1MjAxNCBkXHUwMEY5bmcgQ0pTIGJ1bmRsZVxuICAgICAgICAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nOiBwYXRoLnJlc29sdmUoXG4gICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICdub2RlX21vZHVsZXMvQG1lZGlhcGlwZS90YXNrcy12aXNpb24vdmlzaW9uX2J1bmRsZS5janMnXG4gICAgICAgICksXG4gICAgICB9LFxuICAgIH0sXG5cbiAgICAvLyBEZXYgc2VydmVyIHByb3h5IFx1MjE5MiBOZXh0LmpzIGJhY2tlbmQgKGhvXHUxRUI3YyBSdXN0IGFlcm8tYmFja2VuZClcbiAgICBzZXJ2ZXI6IHtcbiAgICAgIHBvcnQ6IDMwMDEsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICAvLyBcdTAxMTBcdTFFQ0RjIHRcdTFFRUIgLmVudiBcdTAxMTFcdTAwRTMgbG9hZCBcdTIwMTQgZmFsbGJhY2sgdlx1MUVDMSBOZXh0LmpzIGRldiBzZXJ2ZXJcbiAgICAgICAgICB0YXJnZXQ6IGVudi5WSVRFX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCcsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIH0sXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICAgIHRhcmdldDogZW52LlZJVEVfV1NfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjMwMDAnLFxuICAgICAgICAgIHdzOiB0cnVlLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcblxuICAgIC8vIEJ1aWxkIG9wdGltaXphdGlvbnNcbiAgICBidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbXG4gICAgICAgICAgLy8gRXhjbHVkZSBtZWRpYXBpcGUgZnJvbSBidW5kbGUgXHUyMDE0IGxvYWRlZCB2aWEgQ0ROIG9yIG5vdCBuZWVkZWQgYXQgcnVudGltZVxuICAgICAgICAgIC8vIFVuY29tbWVudCBpZiBzdGlsbCBjYXVzaW5nIGlzc3VlcyBhZnRlciBhbGlhcyBmaXg6XG4gICAgICAgICAgLy8gJ0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uJyxcbiAgICAgICAgXSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICAgJ3F1ZXJ5LXZlbmRvcic6IFsnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JywgJ2F4aW9zJ10sXG4gICAgICAgICAgICAncmFkaXgtdmVuZG9yJzogW1xuICAgICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtdGFicycsXG4gICAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1hdmF0YXInLFxuICAgICAgICAgICAgXSxcbiAgICAgICAgICAgIC8vIDNEIGxpYnJhcmllcyBcdTIwMTQgbGF6eSBsb2FkZWQgc28gb25seSBwdWxsZWQgd2hlbiB2aXNpdGluZyBsYWIgcGFnZXNcbiAgICAgICAgICAgICd0aHJlZS12ZW5kb3InOiBbJ3RocmVlJywgJ0ByZWFjdC10aHJlZS9maWJlcicsICdAcmVhY3QtdGhyZWUvZHJlaSddLFxuICAgICAgICAgICAgJ2NoYXJ0LXZlbmRvcic6IFsncmVjaGFydHMnXSxcbiAgICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXG4gICAgICAgICAgICAnc3RhdGUtdmVuZG9yJzogWyd6dXN0YW5kJ10sXG4gICAgICAgICAgICAvLyBzb2NrZXQuaW8tY2xpZW50IFx1MjAxNCBjaFx1MUVDOSBsb2FkIGtoaSB2XHUwMEUwbyBDaGF0IC8gT25saW5lRXhhbVJvb20gKGxhenkpXG4gICAgICAgICAgICAnc29ja2V0LXZlbmRvcic6IFsnc29ja2V0LmlvLWNsaWVudCddLFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgICAgY2h1bmtTaXplV2FybmluZ0xpbWl0OiAxNTAwLFxuICAgIH0sXG5cbiAgICAvLyBPcHRpbWl6ZSBkZXBzIHByZS1idW5kbGluZ1xuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogW1xuICAgICAgICAncmVhY3QnLFxuICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICAgJ2F4aW9zJyxcbiAgICAgICAgJ3p1c3RhbmQnLFxuICAgICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICAgIF0sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICd0aHJlZScsXG4gICAgICAgICdAcmVhY3QtdGhyZWUvZmliZXInLFxuICAgICAgICAnQHJlYWN0LXRocmVlL2RyZWknLFxuICAgICAgICAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nLFxuICAgICAgXSxcbiAgICB9LFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErVyxTQUFTLGNBQWMsZUFBZTtBQUNyWixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsa0JBQWtCO0FBSDNCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBR3hDLFFBQU0sTUFBTSxRQUFRLE1BQU0sUUFBUSxJQUFJLEdBQUcsRUFBRTtBQUUzQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUE7QUFBQSxNQUVOLFdBQVcsRUFBRSxNQUFNLE9BQU8sVUFBVSxhQUFhLENBQUM7QUFBQSxJQUNwRDtBQUFBLElBRUEsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBO0FBQUEsUUFFTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUE7QUFBQSxRQUVwQywyQkFBMkIsS0FBSztBQUFBLFVBQzlCO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxRQUFRO0FBQUEsTUFDTixNQUFNO0FBQUEsTUFDTixPQUFPO0FBQUEsUUFDTCxRQUFRO0FBQUE7QUFBQSxVQUVOLFFBQVEsSUFBSSxnQkFBZ0I7QUFBQSxVQUM1QixjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsUUFDVjtBQUFBLFFBQ0EsY0FBYztBQUFBLFVBQ1osUUFBUSxJQUFJLGVBQWU7QUFBQSxVQUMzQixJQUFJO0FBQUEsVUFDSixjQUFjO0FBQUEsUUFDaEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBO0FBQUEsSUFHQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixXQUFXO0FBQUEsTUFDWCxlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUEsUUFJVjtBQUFBLFFBQ0EsUUFBUTtBQUFBLFVBQ04sY0FBYztBQUFBLFlBQ1osZ0JBQWdCLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ3pELGdCQUFnQixDQUFDLHlCQUF5QixPQUFPO0FBQUEsWUFDakQsZ0JBQWdCO0FBQUEsY0FDZDtBQUFBLGNBQ0E7QUFBQSxjQUNBO0FBQUEsY0FDQTtBQUFBLGNBQ0E7QUFBQSxZQUNGO0FBQUE7QUFBQSxZQUVBLGdCQUFnQixDQUFDLFNBQVMsc0JBQXNCLG1CQUFtQjtBQUFBLFlBQ25FLGdCQUFnQixDQUFDLFVBQVU7QUFBQSxZQUMzQixlQUFlLENBQUMsbUJBQW1CLHVCQUF1QixLQUFLO0FBQUEsWUFDL0QsZ0JBQWdCLENBQUMsU0FBUztBQUFBO0FBQUEsWUFFMUIsaUJBQWlCLENBQUMsa0JBQWtCO0FBQUEsVUFDdEM7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLE1BQ0EsdUJBQXVCO0FBQUEsSUFDekI7QUFBQTtBQUFBLElBR0EsY0FBYztBQUFBLE1BQ1osU0FBUztBQUFBLFFBQ1A7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxNQUNGO0FBQUEsTUFDQSxTQUFTO0FBQUEsUUFDUDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
