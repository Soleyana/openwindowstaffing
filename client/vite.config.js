import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const proxyTarget = process.env.VITE_PROXY_TARGET || "http://localhost:5000";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inject-api-url",
      transformIndexHtml(html) {
        const url = process.env.VITE_API_URL || "";
        const safe = url.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/</g, "\\u003c");
        return html.replace(
          "<div id=\"root\"></div>",
          `<script>window.__VITE_API_URL__="${safe}";</script>\n    <div id="root"></div>`
        );
      },
    },
  ],
  server: {
    proxy: {
      "/api": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        credentials: true,
      },
      "/uploads": {
        target: proxyTarget,
        changeOrigin: true,
        secure: false,
        credentials: true,
      },
    },
  },
})
