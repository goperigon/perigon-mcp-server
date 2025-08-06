import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), cloudflare(), basicSsl()],
  server: {
    host: "local-mcp.perigon.io",
    port: 5173,
  },
  css: {
    postcss: {
      plugins: [tailwindcss],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
