// Tiện ích xuất file: Excel (.xlsx thật, không cần thư viện) và Word (.doc mở bằng MS Word).
// Dùng chung cho các route /…/export. PDF dùng chức năng "In / Lưu PDF" của trình duyệt.

import { buildXlsx, type Sheet, type Cell } from "@/lib/xlsx";

export type { Sheet, Cell };

const vn = new Intl.NumberFormat("vi-VN");

/** Trả file .xlsx (tải về). */
export function xlsxResponse(filename: string, sheets: Sheet[]): Response {
  const buf = buildXlsx(sheets);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
    },
  });
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export type DocSection = {
  heading?: string;
  columns: string[];
  rows: Cell[][];
  /** Cột (theo chỉ số) cần canh phải + định dạng số nếu là number. */
};

/** Trả file .doc (HTML tương thích Microsoft Word). */
export function wordResponse(
  filename: string,
  opts: { title: string; subtitle?: string; sections: DocSection[] },
): Response {
  const sectionsHtml = opts.sections
    .map((sec) => {
      const head = sec.heading ? `<h2>${esc(sec.heading)}</h2>` : "";
      const ths = sec.columns.map((c) => `<th>${esc(c)}</th>`).join("");
      const trs = sec.rows
        .map((row) => {
          const tds = row
            .map((cell) => {
              if (typeof cell === "number" && Number.isFinite(cell))
                return `<td class="num">${vn.format(Math.round(cell))}</td>`;
              return `<td>${esc(cell == null ? "" : String(cell))}</td>`;
            })
            .join("");
          return `<tr>${tds}</tr>`;
        })
        .join("");
      return `${head}<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(opts.title)}</title>
<style>
  body{font-family:'Times New Roman',serif;color:#111;}
  h1{font-size:18px;margin:0 0 2px;color:#b91c1c;}
  .sub{color:#555;font-size:12px;margin:0 0 14px;}
  h2{font-size:14px;margin:18px 0 6px;}
  table{border-collapse:collapse;width:100%;margin-bottom:8px;}
  th,td{border:1px solid #999;padding:4px 8px;font-size:12px;}
  th{background:#f1f5f9;text-align:left;}
  td.num{text-align:right;}
</style></head>
<body>
  <h1>${esc(opts.title)}</h1>
  ${opts.subtitle ? `<p class="sub">${esc(opts.subtitle)}</p>` : ""}
  ${sectionsHtml}
</body></html>`;

  return new Response("﻿" + html, {
    headers: {
      "Content-Type": "application/msword; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.doc"`,
    },
  });
}

/** CSV (giữ tương thích, mở nhanh bằng Excel). */
export function csvResponse(filename: string, rows: Cell[][]): Response {
  const cell = (v: Cell) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "﻿" + rows.map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
