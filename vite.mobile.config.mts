import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: path.resolve(__dirname, "mobile"),
  base: "/mobile/",
  plugins: [tailwindcss(), react()],
  publicDir: path.resolve(__dirname, "mobile/public"),
  build: {
    outDir: path.resolve(__dirname, "docs/mobile"),
    emptyOutDir: true,
  },
});
