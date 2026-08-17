import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Cho phép test import theo bí danh "@/..." giống mã nguồn (trước đây test phải
  // dùng đường dẫn tương đối và không đụng được các file có import "@/lib/...").
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
