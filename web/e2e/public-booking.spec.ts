import { test, expect } from "@playwright/test";

test.describe("public booking", () => {
  test.skip(() => process.env.E2E_RUN_REAL !== "true", "Set E2E_RUN_REAL=true with a disposable test database.");

  test("giữ dữ liệu khi validation lỗi", async ({ page }) => {
    await page.goto("/dat-lich");
    await page.getByLabel("Họ và tên *").fill("Khách E2E");
    await page.getByLabel("Số điện thoại *").fill("123");
    await page.getByRole("button", { name: /gửi yêu cầu/i }).click();
    await expect(page.getByText(/không hợp lệ/i)).toBeVisible();
    await expect(page.getByLabel("Họ và tên *")).toHaveValue("Khách E2E");
  });

  test("render đúng trên mobile không tràn ngang", async ({ page }) => {
    await page.goto("/dat-lich");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
  });
});
