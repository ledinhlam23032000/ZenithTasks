// ============================================================================
// MARKDOWN TỐI GIẢN (THUẦN) — đủ cho câu trả lời AI: **đậm**, *nghiêng*, `mã`.
// KHÔNG dùng dangerouslySetInnerHTML (an toàn): chỉ tách token, phần render thành
// React do component lo. Block-level (tiêu đề/danh sách) xử lý ở component.
// ============================================================================

export type Inline = { t: "text" | "b" | "i" | "code"; v: string };

/** Tách 1 đoạn văn thành các token nội tuyến: đậm, nghiêng, mã nội tuyến. */
export function parseInline(s: string): Inline[] {
  const out: Inline[] = [];
  // Ưu tiên đậm trước nghiêng (cùng ký tự sao). \x60 = dấu backtick cho mã nội tuyến.
  const re = /(\*\*([^*]+?)\*\*)|(\x60([^\x60]+?)\x60)|(\*([^*\n]+?)\*)|(_([^_\n]+?)_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ t: "text", v: s.slice(last, m.index) });
    if (m[1]) out.push({ t: "b", v: m[2] });
    else if (m[3]) out.push({ t: "code", v: m[4] });
    else if (m[5]) out.push({ t: "i", v: m[6] });
    else if (m[7]) out.push({ t: "i", v: m[8] });
    last = re.lastIndex;
  }
  if (last < s.length) out.push({ t: "text", v: s.slice(last) });
  return out.length ? out : [{ t: "text", v: s }];
}

export type Block =
  | { type: "h"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "p"; text: string };

/** Tách văn bản thành các khối: tiêu đề (#), danh sách (- / 1.), đoạn văn. */
export function parseBlocks(md: string): Block[] {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed === "") {
      flushPara();
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(trimmed);
    if (h) {
      flushPara();
      blocks.push({ type: "h", level: h[1].length, text: h[2] });
      i++;
      continue;
    }
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "ul", items });
      continue;
    }
    if (/^\d+\.\s+/.test(trimmed)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "ol", items });
      continue;
    }
    para.push(trimmed);
    i++;
  }
  flushPara();
  return blocks;
}
