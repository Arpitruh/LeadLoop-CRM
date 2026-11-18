import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({
  resolve: { alias: { "@": resolve(root, "src") } },
  test: { environment: "node", include: ["tests/integration/**/*.test.ts"], testTimeout: 30000, hookTimeout: 30000, fileParallelism: false },
});
