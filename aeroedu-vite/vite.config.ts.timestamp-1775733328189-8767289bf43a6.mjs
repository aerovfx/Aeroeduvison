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
      "@": path.resolve(__vite_injected_original_dirname, "./src")
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
  // Build optimizations — tương đương webpack splitChunks trong Next.js
  build: {
    target: "esnext",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          // Data fetching
          "query-vendor": ["@tanstack/react-query", "axios"],
          // UI Components
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-tabs",
            "@radix-ui/react-select",
            "@radix-ui/react-avatar"
          ],
          // 3D / Heavy — lazy loaded
          "three-vendor": ["three", "@react-three/fiber", "@react-three/drei"],
          // Charts
          "chart-vendor": ["recharts"],
          // Forms
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          // State
          "state-vendor": ["zustand"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
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
    exclude: ["three", "@react-three/fiber", "@react-three/drei"]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9zZXNzaW9ucy9zd2VldC1jb25maWRlbnQtbWVpdG5lci9tbnQvQWVyb2VkdXZpc29uL2Flcm9lZHUtdml0ZS92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vc2Vzc2lvbnMvc3dlZXQtY29uZmlkZW50LW1laXRuZXIvbW50L0Flcm9lZHV2aXNvbi9hZXJvZWR1LXZpdGUvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCdcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbXG4gICAgcmVhY3QoKSxcbiAgICAvLyBCdW5kbGUgYW5hbHl6ZXIgXHUyMDE0IGNoXHUxRUExeTogbnBtIHJ1biBidWlsZCBcdTAxMTFcdTFFQzMgeGVtIHN0YXRzLmh0bWxcbiAgICB2aXN1YWxpemVyKHsgb3BlbjogZmFsc2UsIGZpbGVuYW1lOiAnc3RhdHMuaHRtbCcgfSksXG4gIF0sXG5cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAvLyBHaVx1MUVFRiBuZ3V5XHUwMEVBbiBhbGlhcyAnQC8nIG5oXHUwMUIwIE5leHQuanMgcHJvamVjdFxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIERldiBzZXJ2ZXIgcHJveHkgXHUyMTkyIFJ1c3QgYWVyby1iYWNrZW5kXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDMwMDEsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfQVBJX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo4MDkwJyxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgICcvc29ja2V0LmlvJzoge1xuICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfV1NfVVJMIHx8ICdodHRwOi8vbG9jYWxob3N0OjgwOTAnLFxuICAgICAgICB3czogdHJ1ZSxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuXG4gIC8vIEJ1aWxkIG9wdGltaXphdGlvbnMgXHUyMDE0IHRcdTAxQjBcdTAxQTFuZyBcdTAxMTFcdTAxQjBcdTAxQTFuZyB3ZWJwYWNrIHNwbGl0Q2h1bmtzIHRyb25nIE5leHQuanNcbiAgYnVpbGQ6IHtcbiAgICB0YXJnZXQ6ICdlc25leHQnLFxuICAgIHNvdXJjZW1hcDogZmFsc2UsXG4gICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgb3V0cHV0OiB7XG4gICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgIC8vIENvcmUgUmVhY3RcbiAgICAgICAgICAncmVhY3QtdmVuZG9yJzogWydyZWFjdCcsICdyZWFjdC1kb20nLCAncmVhY3Qtcm91dGVyLWRvbSddLFxuICAgICAgICAgIC8vIERhdGEgZmV0Y2hpbmdcbiAgICAgICAgICAncXVlcnktdmVuZG9yJzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknLCAnYXhpb3MnXSxcbiAgICAgICAgICAvLyBVSSBDb21wb25lbnRzXG4gICAgICAgICAgJ3JhZGl4LXZlbmRvcic6IFtcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZGlhbG9nJyxcbiAgICAgICAgICAgICdAcmFkaXgtdWkvcmVhY3QtZHJvcGRvd24tbWVudScsXG4gICAgICAgICAgICAnQHJhZGl4LXVpL3JlYWN0LXRhYnMnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1zZWxlY3QnLFxuICAgICAgICAgICAgJ0ByYWRpeC11aS9yZWFjdC1hdmF0YXInLFxuICAgICAgICAgIF0sXG4gICAgICAgICAgLy8gM0QgLyBIZWF2eSBcdTIwMTQgbGF6eSBsb2FkZWRcbiAgICAgICAgICAndGhyZWUtdmVuZG9yJzogWyd0aHJlZScsICdAcmVhY3QtdGhyZWUvZmliZXInLCAnQHJlYWN0LXRocmVlL2RyZWknXSxcbiAgICAgICAgICAvLyBDaGFydHNcbiAgICAgICAgICAnY2hhcnQtdmVuZG9yJzogWydyZWNoYXJ0cyddLFxuICAgICAgICAgIC8vIEZvcm1zXG4gICAgICAgICAgJ2Zvcm0tdmVuZG9yJzogWydyZWFjdC1ob29rLWZvcm0nLCAnQGhvb2tmb3JtL3Jlc29sdmVycycsICd6b2QnXSxcbiAgICAgICAgICAvLyBTdGF0ZVxuICAgICAgICAgICdzdGF0ZS12ZW5kb3InOiBbJ3p1c3RhbmQnXSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gIH0sXG5cbiAgLy8gT3B0aW1pemUgZGVwcyBwcmUtYnVuZGxpbmdcbiAgb3B0aW1pemVEZXBzOiB7XG4gICAgaW5jbHVkZTogW1xuICAgICAgJ3JlYWN0JyxcbiAgICAgICdyZWFjdC1kb20nLFxuICAgICAgJ3JlYWN0LXJvdXRlci1kb20nLFxuICAgICAgJ0B0YW5zdGFjay9yZWFjdC1xdWVyeScsXG4gICAgICAnYXhpb3MnLFxuICAgICAgJ3p1c3RhbmQnLFxuICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgXSxcbiAgICBleGNsdWRlOiBbJ3RocmVlJywgJ0ByZWFjdC10aHJlZS9maWJlcicsICdAcmVhY3QtdGhyZWUvZHJlaSddLFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBK1csU0FBUyxvQkFBb0I7QUFDNVksT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGtCQUFrQjtBQUgzQixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUE7QUFBQSxJQUVOLFdBQVcsRUFBRSxNQUFNLE9BQU8sVUFBVSxhQUFhLENBQUM7QUFBQSxFQUNwRDtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBO0FBQUEsTUFFTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUE7QUFBQSxFQUdBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVEsUUFBUSxJQUFJLGdCQUFnQjtBQUFBLFFBQ3BDLGNBQWM7QUFBQSxRQUNkLFFBQVE7QUFBQSxNQUNWO0FBQUEsTUFDQSxjQUFjO0FBQUEsUUFDWixRQUFRLFFBQVEsSUFBSSxlQUFlO0FBQUEsUUFDbkMsSUFBSTtBQUFBLFFBQ0osY0FBYztBQUFBLE1BQ2hCO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQTtBQUFBLEVBR0EsT0FBTztBQUFBLElBQ0wsUUFBUTtBQUFBLElBQ1IsV0FBVztBQUFBLElBQ1gsZUFBZTtBQUFBLE1BQ2IsUUFBUTtBQUFBLFFBQ04sY0FBYztBQUFBO0FBQUEsVUFFWixnQkFBZ0IsQ0FBQyxTQUFTLGFBQWEsa0JBQWtCO0FBQUE7QUFBQSxVQUV6RCxnQkFBZ0IsQ0FBQyx5QkFBeUIsT0FBTztBQUFBO0FBQUEsVUFFakQsZ0JBQWdCO0FBQUEsWUFDZDtBQUFBLFlBQ0E7QUFBQSxZQUNBO0FBQUEsWUFDQTtBQUFBLFlBQ0E7QUFBQSxVQUNGO0FBQUE7QUFBQSxVQUVBLGdCQUFnQixDQUFDLFNBQVMsc0JBQXNCLG1CQUFtQjtBQUFBO0FBQUEsVUFFbkUsZ0JBQWdCLENBQUMsVUFBVTtBQUFBO0FBQUEsVUFFM0IsZUFBZSxDQUFDLG1CQUFtQix1QkFBdUIsS0FBSztBQUFBO0FBQUEsVUFFL0QsZ0JBQWdCLENBQUMsU0FBUztBQUFBLFFBQzVCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLHVCQUF1QjtBQUFBLEVBQ3pCO0FBQUE7QUFBQSxFQUdBLGNBQWM7QUFBQSxJQUNaLFNBQVM7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUyxDQUFDLFNBQVMsc0JBQXNCLG1CQUFtQjtBQUFBLEVBQzlEO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
