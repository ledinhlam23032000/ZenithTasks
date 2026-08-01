import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

async function renderPage(modulePath: string) {
  const pageModule = await import(/* @vite-ignore */ modulePath).catch(() => null);
  expect(pageModule).not.toBeNull();

  const Page = pageModule!.default;
  return renderToStaticMarkup(createElement(Page));
}

describe("public legal pages", () => {
  it("publishes a privacy policy with the hospital contact", async () => {
    const html = await renderPage("./chinh-sach-quyen-rieng/page");

    expect(html).toContain("Chính sách quyền riêng tư");
    expect(html).toContain("benhviendakhoahongphuchaiphong@gmail.com");
  });

  it("publishes terms of use for ZenithTasks", async () => {
    const html = await renderPage("./dieu-khoan-su-dung/page");

    expect(html).toContain("Điều khoản sử dụng");
    expect(html).toContain("ZenithTasks");
  });

  it("publishes actionable Facebook data-deletion instructions", async () => {
    const html = await renderPage("./xoa-du-lieu/page");

    expect(html).toContain("Yêu cầu xóa dữ liệu");
    expect(html).toContain("mailto:benhviendakhoahongphuchaiphong@gmail.com");
    expect(html).toContain("Mã Facebook");
  });
});
