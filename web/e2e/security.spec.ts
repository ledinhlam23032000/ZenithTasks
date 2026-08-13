import { test, expect } from "@playwright/test";

test.describe("security smoke", () => {
  test.skip(() => process.env.E2E_RUN_REAL !== "true", "Set E2E_RUN_REAL=true with a disposable test database.");

  test("upload path không được phục vụ trực tiếp", async ({ request }) => {
    const response = await request.get("/uploads/unknown-file.jpg");
    expect(response.status()).toBe(404);
  });

  test("media không có token/phiên bị từ chối", async ({ request }) => {
    const response = await request.get("/media/unknown-file.jpg");
    expect(response.status()).toBe(404);
  });
});
