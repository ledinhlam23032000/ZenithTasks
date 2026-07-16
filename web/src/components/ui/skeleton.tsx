/**
 * Khung chờ (loading skeleton) đúng HÌNH DẠNG theo loại trang — trước đây mọi trang dùng
 * chung 1 khung kiểu "bảng tổng quan" (`(app)/loading.tsx`) nên lúc tải xong hay bị "giật"
 * vì không khớp hình dạng thật. Dùng ở các `loading.tsx` theo từng nhóm trang.
 */
export function SkeletonListPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="h-9 w-48 rounded-lg shimmer" />
          <div className="h-4 w-64 rounded shimmer" />
        </div>
        <div className="h-9 w-32 rounded-lg shimmer" />
      </div>
      <div className="h-11 w-full max-w-sm rounded-lg shimmer" />
      <div className="overflow-hidden rounded-2xl border border-slate-200/80">
        <div className="h-11 w-full shimmer" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 w-full border-t border-slate-100 shimmer" style={{ animationDelay: `${i * 40}ms` }} />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDetailPage() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-40 rounded shimmer" />
      <div className="flex items-center justify-between gap-3">
        <div className="h-9 w-56 rounded-lg shimmer" />
        <div className="h-9 w-28 rounded-lg shimmer" />
      </div>
      <div className="h-20 w-full rounded-2xl shimmer" />
      <div className="h-11 w-full max-w-2xl rounded-lg shimmer" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="h-64 rounded-2xl shimmer" />
        </div>
        <div className="space-y-4">
          <div className="h-48 rounded-2xl shimmer" />
          <div className="h-40 rounded-2xl shimmer" />
        </div>
      </div>
    </div>
  );
}
