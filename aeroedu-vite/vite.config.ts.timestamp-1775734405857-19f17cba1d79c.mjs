// vite.config.ts
import { defineConfig } from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { visualizer } from "file:///sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
var __vite_injected_original_dirname = "/sessions/sweet-confident-meitner/mnt/Aeroeduvison/aeroedu-vite";
var vite_config_default = defineConfig({
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
  // Dev server proxy → Rust aero-backend
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8090",
        changeOrigin: true,
        secure: false
      },
      "/socket.io": {
        target: process.env.VITE_WS_URL || "http://localhost:8090",
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
          "state-vendor": ["zustand"]
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
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9zd2VldC1jb25maWRlbnQtbWVpdG5lci9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgXHUyMDE0IGNoXHUxRUExeTogbnBtIHJ1biBidWlsZCBcdTAxMTFcdTFFQzMgeGVtIHN0YXRzLmh0bWxcbiAgICB2aXN1YWxpemVyKHsgb3BlbjogZmFsc2UsIGZpbGVuYW1lOiAnc3RhdHMuaHRtbCcgfSksXG4gIF0sXG5cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAvLyBHaVx1MUVFRiBuZ3V5XHUwMEVBbiBhbGlhcyAnQC8nIG5oXHUwMUIwIE5leHQuanMgcHJvamVjdFxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgIC8vIEZpeCBAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbiAocHVsbGVkIGluIGJ5IEByZWFjdC10aHJlZS9kcmVpKSBcdTIwMTQgZFx1MDBGOW5nIENKUyBidW5kbGVcbiAgICAgICdAbWVkaWFwaXBlL3Rhc2tzLXZpc2lvbic6IHBhdGgucmVzb2x2ZShcbiAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAnbm9kZV9tb2R1bGVzL0BtZWRpYXBpcGUvdGFza3MtdmlzaW9uL3Zpc2lvbl9idW5kbGUuY2pzJ1xuICAgICAgKSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIERldiBzZXJ2ZXIgcHJveHkgXHUyMTkyIFJ1c3QgYWVyby1iYWNrZW5kXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDEsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfQVBJX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDkwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfV1NfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwOTAnLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIEJ1aWxkIG9wdGltaXphdGlvbnNcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgLy8gRXhjbHVkZSBtZWRpYXBpcGUgZnJvbSBidW5kbGUgXHUyMDE0IGxvYWRlZCB2aWEgQ0ROIG9yIG5vdCBuZWVkZWQgYXQgcnVudGltZVxuICAgICAgICAvLyBVbmNvbW1lbnQgaWYgc3RpbGwgY2F1c2luZyBpc3N1ZXMgYWZ0ZXIgYWxpYXMgZml4OlxuICAgICAgICAvLyAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nLFxuICAgICAgXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBtYW51YWxDaHVua3M6IHtcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgICdxdWVyeS12ZW5kb3InOiBbJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsICdheGlvcyddLFxuICAgICAgICAgICdyYWRpeC12ZW5kb3InOiBbXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRpYWxvZycsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LWRyb3Bkb3duLW1lbnUnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC10YWJzJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3Qtc2VsZWN0JyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtYXZhdGFyJyxcbiAgICAgICAgICBdLFxuICAgICAgICAgIC8vIDNEIGxpYnJhcmllcyBcdTIwMTQgbGF6eSBsb2FkZWQgc28gb25seSBwdWxsZWQgd2hlbiB2aXNpdGluZyBsYWIgcGFnZXNcbiAgICAgICAgICAndGhyZWUtdmVuZG9yJzogWyd0aHJlZScsICdAcmVhY3QtdGhyZWUvZmliZXInLCAnQHJlYWN0LXRocmVlL2RyZWknXSxcbiAgICAgICAgICAnY2hhcnQtdmVuZG9yJzogWydyZWNoYXJ0cyddLFxuICAgICAgICAgICdmb3JtLXZlbmRvcic6IFsncmVhY3QtaG9vay1mb3JtJywgJ0Bob29rZm9ybS9yZXNvbHZlcnMnLCAnem9kJ10sXG4gICAgICAgICAgJ3N0YXRlLXZlbmRvcic6IFsnenVzdGFuZCddLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTUwMCxcbiAgfSxcblxuICAvLyBPcHRpbWl6ZSBkZXBzIHByZS1idW5kbGluZ1xuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBpbmNsdWRlOiBbXG4gICAgICAncmVhY3QnLFxuICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAncmVhY3Qtcm91dGVyLWRvbScsXG4gICAgICAnQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5JyxcbiAgICAgICdheGlvcycsXG4gICAgICAnenVzdGFuZCcsXG4gICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICBdLFxuICAgIGV4Y2x1ZGU6IFtcbiAgICAgICd0aHJlZScsXG4gICAgICAnQHJlYWN0LXRocmVlL2ZpYmVyJyxcbiAgICAgICdAcmVhY3QtdGhyZWUvZHJlaScsXG4gICAgICAnQG1lZGlhcGlwZS90YXNrcy12aXNpb24nLFxuICAgIF0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUErVyxTQUFTLG9CQUFvQjtBQUM1WSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsa0JBQWtCO0FBSDNCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBLElBRU4sV0FBVyxFQUFFLE1BQU0sT0FBTyxVQUFVLGFBQWEsQ0FBQztBQUFBLEVBQ3BEO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUE7QUFBQSxNQUVMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQTtBQUFBLE1BRXBDLDJCQUEyQixLQUFLO0FBQUEsUUFDOUI7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVEsUUFBUSxJQUFJLGdCQUFnQjtBQUFBLFFBQ3BDLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixRQUFRLFFBQVEsSUFBSSxlQUFlO0FBQUEsUUFDbkMsSUFBSTtBQUFBLFFBQ0osY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BSVY7QUFBQSxNQUNBLFFBQVE7QUFBQSxRQUNOLGNBQWM7QUFBQSxVQUNaLGdCQUFnQixDQUFDLFNBQVMsYUFBYSxrQkFBa0I7QUFBQSxVQUN6RCxnQkFBZ0IsQ0FBQyx5QkFBeUIsT0FBTztBQUFBLFVBQ2pELGdCQUFnQjtBQUFBLFlBQ2Q7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsVUFDRjtBQUFBO0FBQUEsVUFFQSxnQkFBZ0IsQ0FBQyxTQUFTLHNCQUFzQixtQkFBbUI7QUFBQSxVQUNuRSxnQkFBZ0IsQ0FBQyxVQUFVO0FBQUEsVUFDM0IsZUFBZSxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBLFVBQy9ELGdCQUFnQixDQUFDLFNBQVM7QUFBQSxRQUM1QjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSx1QkFBdUI7QUFBQSxFQUN6QjtBQUFBO0FBQUEsRUFHQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0Y7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
