import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Relative base so assets (e.g. logo) work when app is loaded via loadFile in production (file://)
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, "index.html"),
        titlebar: path.resolve(__dirname, "titlebar.html"),
      },
    },
  },
});
