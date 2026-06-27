import { ShieldAlert } from "lucide-react";

/**
 * Cảnh báo AN TOÀN Y KHOA (B6 gđ1) — hiện dị ứng / tiền sử / chống chỉ định của khách
 * để bác sĩ thấy TRƯỚC khi làm dịch vụ. Ẩn hoàn toàn nếu không có thông tin nào.
 * `compact` = bản gọn (đặt đầu trang hồ sơ điều trị).
 */
export function MedicalAlert({
  allergies,
  medicalHistory,
  contraindications,
  compact = false,
}: {
  allergies?: string | null;
  medicalHistory?: string | null;
  contraindications?: string | null;
  compact?: boolean;
}) {
  const rows: { label: string; value: string; danger: boolean }[] = [];
  if (allergies?.trim()) rows.push({ label: "Dị ứng", value: allergies.trim(), danger: true });
  if (contraindications?.trim()) rows.push({ label: "Chống chỉ định", value: contraindications.trim(), danger: true });
  if (medicalHistory?.trim()) rows.push({ label: "Tiền sử / thuốc", value: medicalHistory.trim(), danger: false });
  if (rows.length === 0) return null;

  return (
    <div className={`rounded-xl border border-rose-300 bg-rose-50 ${compact ? "px-3 py-2" : "px-4 py-3"}`}>
      <p className={`inline-flex items-center gap-1.5 font-semibold text-rose-700 ${compact ? "text-sm" : ""}`}>
        <ShieldAlert className={compact ? "h-4 w-4" : "h-5 w-5"} /> Lưu ý an toàn y khoa
      </p>
      <ul className={`mt-1.5 space-y-1 ${compact ? "text-xs" : "text-sm"}`}>
        {rows.map((r) => (
          <li key={r.label} className="flex gap-2">
            <span className={`shrink-0 font-medium ${r.danger ? "text-rose-700" : "text-slate-600"}`}>{r.label}:</span>
            <span className={r.danger ? "text-rose-800" : "text-slate-700"}>{r.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
