import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      external: ["@prisma/client"]
    }
  },
  resolve: {
    alias: {
      // Prevent bundling of seed files
      'prisma/seed': false
    }
  }
});
