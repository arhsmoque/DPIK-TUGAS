import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(root, "../..");

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      "@foundation": path.resolve(repoRoot, "src/foundation"),
      "@modules": path.resolve(repoRoot, "src/modules"),
      "@composition": path.resolve(repoRoot, "src/composition")
    }
  },
  build: {
    outDir: path.resolve(repoRoot, "dist/internal"),
    emptyOutDir: true
  }
});
