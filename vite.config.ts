import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/postcss";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), cloudflare()],
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
