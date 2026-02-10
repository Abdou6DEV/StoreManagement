import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  // Relative base so assets (e.g. logo) work when app is loaded via loadFile in production (file://)
  base: "./",
});
