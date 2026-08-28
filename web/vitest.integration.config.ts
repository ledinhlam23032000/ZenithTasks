import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Lane RIÊNG cho test chạm database QA thật. Tách khỏi vitest.config.ts để
// `npm test` (91 file thuần, không cần DB) vẫn chạy được ở CI/máy chưa có QA.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.itest.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
