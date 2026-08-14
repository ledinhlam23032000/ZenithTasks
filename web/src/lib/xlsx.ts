// Trình tạo file .xlsx tối giản, KHÔNG phụ thuộc thư viện ngoài.
// Một file .xlsx thực chất là một file ZIP chứa vài file XML. Ở đây ta tự dựng
// ZIP (deflate qua zlib có sẵn của Node) + các phần XML tối thiểu để Excel/Google
// Sheets mở được mà KHÔNG báo "sai định dạng". Hỗ trợ chuỗi + số, in đậm tiêu đề,
// định dạng số có dấu phân cách hàng nghìn.

import zlib from "node:zlib";

export type Cell = string | number | null | undefined;
export type Sheet = {
  name: string;
  columns: { header: string; width?: number }[];
  rows: Cell[][];
};

// ----- CRC32 (cho ZIP) -----
let crcTable: Uint32Array | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = (crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  return (crc ^ 0xffffffff) >>> 0;
}

// ----- ZIP (deflate) -----
function zip(files: { name: string; data: Buffer }[]): Buffer {
  const local: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8");
    const crc = crc32(f.data);
    const comp = zlib.deflateRawSync(f.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);
    lh.writeUInt16LE(20, 4);
    lh.writeUInt16LE(0, 6);
    lh.writeUInt16LE(8, 8); // deflate
    lh.writeUInt16LE(0, 10);
    lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(comp.length, 18);
    lh.writeUInt32LE(f.data.length, 22);
    lh.writeUInt16LE(name.length, 26);
    lh.writeUInt16LE(0, 28);
    local.push(lh, name, comp);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(f.data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += lh.length + name.length + comp.length;
  }
  const centralBuf = Buffer.concat(central);
  const localBuf = Buffer.concat(local);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralBuf.length, 12);
  eocd.writeUInt32LE(localBuf.length, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([localBuf, centralBuf, eocd]);
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function colName(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

function sheetXml(sheet: Sheet): string {
  const cols = sheet.columns
    .map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width ?? 18}" customWidth="1"/>`)
    .join("");

  const headerRow = `<row r="1">${sheet.columns
    .map((c, i) => `<c r="${colName(i)}1" s="1" t="inlineStr"><is><t xml:space="preserve">${esc(c.header)}</t></is></c>`)
    .join("")}</row>`;

  const bodyRows = sheet.rows
    .map((row, ri) => {
      const r = ri + 2;
      const cells = row
        .map((val, ci) => {
          const ref = `${colName(ci)}${r}`;
          if (val == null || val === "") return "";
          if (typeof val === "number" && Number.isFinite(val)) {
            return `<c r="${ref}" s="2"><v>${val}</v></c>`;
          }
          return `<c r="${ref}" s="0" t="inlineStr"><is><t xml:space="preserve">${esc(String(val))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}">${cells}</row>`;
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${cols}</cols><sheetData>${headerRow}${bodyRows}</sheetData></worksheet>`;
}

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;

// ============================================================================
// "RICH" SHEET — dựng file .xlsx có định dạng đầy đủ (merge ô, viền, font, canh
// giữa, khổ ngang) để in đúng mẫu biểu công ty (vd bảng lương có tiêu đề công
// ty, lưới ngày công, chữ ký). Tách hẳn khỏi `Sheet`/`buildXlsx` ở trên (giữ
// nguyên, không đổi) — dùng khi cần layout tự do theo toạ độ ô thay vì bảng
// cột-hàng đơn giản.
// ============================================================================

export type RichFont = { name?: string; size?: number; bold?: boolean };
export type RichAlign = "left" | "center" | "right";
export type RichCellStyle = {
  font?: RichFont;
  align?: RichAlign;
  valign?: "top" | "center" | "bottom";
  wrap?: boolean;
  border?: boolean; // viền mảnh 4 cạnh
  fill?: "header"; // nền xám nhạt (tiêu đề bảng) — bỏ trống = không tô nền
  numFmt?: "int"; // số nguyên có dấu phân cách hàng nghìn — bỏ trống = văn bản thường
};
export type RichCell = { value?: Cell; style?: RichCellStyle } | null | undefined;
export type RichSheet = {
  name: string;
  rows: RichCell[][];
  /** Độ rộng cột theo chỉ số 0-based; bỏ trống = mặc định. */
  columnWidths?: (number | undefined)[];
  /** Chiều cao hàng theo chỉ số 0-based (điểm); bỏ trống = mặc định. */
  rowHeights?: (number | undefined)[];
  /** Vùng ô gộp, dạng "A1:F1". Chỉ ghi giá trị vào ô góc trên-trái của vùng. */
  merges?: string[];
  landscape?: boolean;
};

class StyleRegistry {
  fonts: RichFont[] = [{}]; // index 0 = mặc định (Calibri 11 thường)
  fills: string[] = ["__none__", "__gray125__"]; // 2 mục bắt buộc theo chuẩn OOXML, giữ nguyên thứ tự
  xfs: { fontId: number; fillId: number; borderId: number; numFmtId: number; align?: RichAlign; valign?: RichCellStyle["valign"]; wrap?: boolean }[] = [
    { fontId: 0, fillId: 0, borderId: 0, numFmtId: 0 }, // index 0 = mặc định
  ];

  fontId(f?: RichFont): number {
    if (!f) return 0;
    const key = JSON.stringify(f);
    const i = this.fonts.findIndex((x) => JSON.stringify(x) === key);
    if (i >= 0) return i;
    return this.fonts.push(f) - 1;
  }

  fillId(fill?: RichCellStyle["fill"]): number {
    if (fill !== "header") return 0;
    const i = this.fills.indexOf("header");
    if (i >= 0) return i;
    return this.fills.push("header") - 1;
  }

  xfId(style?: RichCellStyle): number {
    const fontId = this.fontId(style?.font);
    const fillId = this.fillId(style?.fill);
    const borderId = style?.border ? 1 : 0;
    const numFmtId = style?.numFmt === "int" ? 164 : 0;
    const align = style?.align;
    const valign = style?.valign;
    const wrap = style?.wrap;
    const key = JSON.stringify({ fontId, fillId, borderId, numFmtId, align, valign, wrap });
    const i = this.xfs.findIndex((x) => JSON.stringify({ fontId: x.fontId, fillId: x.fillId, borderId: x.borderId, numFmtId: x.numFmtId, align: x.align, valign: x.valign, wrap: x.wrap }) === key);
    if (i >= 0) return i;
    return this.xfs.push({ fontId, fillId, borderId, numFmtId, align, valign, wrap }) - 1;
  }

  toStylesXml(): string {
    const fontsXml = this.fonts
      .map((f) => `<font>${f.bold ? "<b/>" : ""}<sz val="${f.size ?? 11}"/><name val="${esc(f.name ?? "Calibri")}"/></font>`)
      .join("");
    const fillsXml = this.fills
      .map((f) => {
        if (f === "__none__") return `<fill><patternFill patternType="none"/></fill>`;
        if (f === "__gray125__") return `<fill><patternFill patternType="gray125"/></fill>`;
        return `<fill><patternFill patternType="solid"><fgColor rgb="FFE8E8E8"/><bgColor indexed="64"/></patternFill></fill>`;
      })
      .join("");
    const xfsXml = this.xfs
      .map((x) => {
        const hasAlign = x.align || x.valign || x.wrap;
        const alignXml = hasAlign
          ? `<alignment${x.align ? ` horizontal="${x.align}"` : ""}${x.valign ? ` vertical="${x.valign}"` : ""}${x.wrap ? ` wrapText="1"` : ""}/>`
          : "";
        return `<xf numFmtId="${x.numFmtId}" fontId="${x.fontId}" fillId="${x.fillId}" borderId="${x.borderId}" xfId="0" applyFont="1" applyFill="1" applyBorder="1"${x.numFmtId ? ' applyNumberFormat="1"' : ""}${hasAlign ? ' applyAlignment="1"' : ""}>${alignXml}</xf>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0"/></numFmts><fonts count="${this.fonts.length}">${fontsXml}</fonts><fills count="${this.fills.length}">${fillsXml}</fills><borders count="2"><border/><border><left style="thin"/><right style="thin"/><top style="thin"/><bottom style="thin"/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${this.xfs.length}">${xfsXml}</cellXfs></styleSheet>`;
  }
}

function richSheetXml(sheet: RichSheet, reg: StyleRegistry): string {
  const colsXml = (sheet.columnWidths ?? [])
    .map((w, i) => (w ? `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>` : ""))
    .join("");

  const rowsXml = sheet.rows
    .map((row, ri) => {
      const r = ri + 1;
      const h = sheet.rowHeights?.[ri];
      const cellsXml = row
        .map((cell, ci) => {
          if (!cell) return "";
          const ref = `${colName(ci)}${r}`;
          const s = reg.xfId(cell.style);
          const val = cell.value;
          if (val == null || val === "") return s ? `<c r="${ref}" s="${s}"/>` : "";
          if (typeof val === "number" && Number.isFinite(val)) return `<c r="${ref}" s="${s}"><v>${val}</v></c>`;
          return `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(String(val))}</t></is></c>`;
        })
        .join("");
      return `<row r="${r}"${h ? ` ht="${h}" customHeight="1"` : ""}>${cellsXml}</row>`;
    })
    .join("");

  const mergesXml = sheet.merges?.length
    ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>`
    : "";
  const pageSetupXml = sheet.landscape ? `<pageSetup orientation="landscape" paperSize="9"/>` : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols>${colsXml}</cols><sheetData>${rowsXml}</sheetData>${mergesXml}${pageSetupXml}</worksheet>`;
}

/** Dựng file .xlsx có định dạng đầy đủ (merge ô, viền, font, khổ ngang…). */
export function buildRichXlsx(sheets: RichSheet[]): Buffer {
  const list = sheets.length ? sheets : [{ name: "Sheet1", rows: [] }];
  const reg = new StyleRegistry();
  const sheetXmls = list.map((s) => richSheetXml(s, reg)); // phải dựng TRƯỚC styles.xml để đăng ký hết font/fill dùng tới

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${list
    .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
    .join("")}</Types>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${list
    .map((s, i) => `<sheet name="${esc(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets></workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join("")}<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const files: { name: string; data: Buffer }[] = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(RELS, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(reg.toStylesXml(), "utf8") },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXmls[i], "utf8") })),
  ];

  return zip(files);
}

/** Dựng file .xlsx (nhiều sheet) trả về Buffer. */
export function buildXlsx(sheets: Sheet[]): Buffer {
  const list = sheets.length ? sheets : [{ name: "Sheet1", columns: [], rows: [] }];

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${list
    .map(
      (_, i) =>
        `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    )
    .join("")}</Types>`;

  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${list
    .map((s, i) => `<sheet name="${esc(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join("")}</sheets></workbook>`;

  const wbRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${list
    .map(
      (_, i) =>
        `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
    )
    .join("")}<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;

  const files: { name: string; data: Buffer }[] = [
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(RELS, "utf8") },
    { name: "xl/workbook.xml", data: Buffer.from(workbook, "utf8") },
    { name: "xl/_rels/workbook.xml.rels", data: Buffer.from(wbRels, "utf8") },
    { name: "xl/styles.xml", data: Buffer.from(STYLES, "utf8") },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXml(s), "utf8") })),
  ];

  return zip(files);
}
