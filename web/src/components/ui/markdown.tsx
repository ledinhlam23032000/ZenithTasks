import { parseBlocks, parseInline, type Inline } from "@/lib/markdown";
import { cn } from "@/lib/cn";

function Inlines({ tokens }: { tokens: Inline[] }) {
  return (
    <>
      {tokens.map((tk, i) => {
        if (tk.t === "b") return <strong key={i} className="font-semibold text-slate-900">{tk.v}</strong>;
        if (tk.t === "i") return <em key={i}>{tk.v}</em>;
        if (tk.t === "code")
          return (
            <code key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-brand-700">
              {tk.v}
            </code>
          );
        return <span key={i}>{tk.v}</span>;
      })}
    </>
  );
}

/** Render markdown tối giản (đậm/nghiêng/mã + tiêu đề + danh sách) — an toàn, không HTML thô. */
export function Markdown({ text, className }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);
  return (
    <div className={cn("space-y-2 text-sm leading-relaxed text-slate-700", className)}>
      {blocks.map((b, i) => {
        if (b.type === "h") {
          const cls = "font-semibold text-slate-900 " + (b.level === 1 ? "text-base" : "text-sm");
          return (
            <p key={i} className={cls}>
              <Inlines tokens={parseInline(b.text)} />
            </p>
          );
        }
        if (b.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5 marker:text-slate-400">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inlines tokens={parseInline(it)} />
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5 marker:text-slate-400">
              {b.items.map((it, j) => (
                <li key={j}>
                  <Inlines tokens={parseInline(it)} />
                </li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i}>
            <Inlines tokens={parseInline(b.text)} />
          </p>
        );
      })}
    </div>
  );
}
