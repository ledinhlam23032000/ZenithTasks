export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-9 w-56 rounded-lg shimmer" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl shimmer" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="h-72 rounded-2xl shimmer lg:col-span-3" />
        <div className="h-72 rounded-2xl shimmer lg:col-span-2" />
      </div>
    </div>
  );
}
