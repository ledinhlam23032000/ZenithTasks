"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Send, Star } from "lucide-react";
import { portalSubmitNps } from "./actions";

/**
 * Khách tự đánh giá trải nghiệm (NPS 0–10) + góp ý — gọi server action công khai
 * (đã kiểm token + hạn dùng). Sau khi gửi hiện lời cảm ơn.
 */
export function PortalNpsForm({ token }: { token: string }) {
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    if (score == null) {
      setErr("Vui lòng chọn mức điểm trước khi gửi.");
      return;
    }
    setErr(null);
    start(async () => {
      const r = await portalSubmitNps(token, score, comment);
      if (r.error) setErr(r.error);
      else setDone(true);
    });
  }

  if (done) {
    return (
      <p className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
        <Star className="h-4 w-4" /> Cảm ơn Quý khách đã đánh giá!
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Quý khách hài lòng thế nào về dịch vụ của chúng tôi? (0 = rất không hài lòng, 10 = rất hài lòng)</p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 11 }, (_, i) => i).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setScore(n)}
            disabled={pending}
            aria-pressed={score === n}
            className={`h-9 w-9 rounded-lg border text-sm font-semibold transition ${
              score === n
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-slate-200 text-slate-600 hover:border-brand-300 hover:bg-brand-50"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Góp ý thêm cho chúng tôi (không bắt buộc)…"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400"
      />
      {err && <p className="text-xs text-rose-600">{err}</p>}
      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Gửi đánh giá
      </button>
    </div>
  );
}
