import { writeFileSync } from "node:fs";
import path from "path";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/postcss";
import basicSsl from "@vitejs/plugin-basic-ssl";

/** Cloudflare Assets redirects (production deploy only; not used by Vite dev). */
function mcpPlaygroundAssetRedirects(): Plugin {
  return {
    name: "mcp-playground-asset-redirects",
    closeBundle() {
      if (process.env.CLOUDFLARE_ENV !== "production") return;
      const redirectsPath = path.resolve(__dirname, "dist/client/_redirects");
      writeFileSync(
        redirectsPath,
        [
          "/ https://perigon.io/mcp 302",
          "/chat https://perigon.io/mcp?tab=chat 302",
          "/inspector https://perigon.io/mcp 302",
        ].join("\n") + "\n",
        "utf8",
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react(), cloudflare(), mcpPlaygroundAssetRedirects(), basicSsl()],
  server: {
    //Make sure to add this to /etc/hosts - 127.0.0.1 local-mcp.perigon.io
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
