export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="space-y-6">
      <div className="skeleton h-9 w-64" />
      <div className="skeleton h-4 w-96 max-w-full" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24" />)}
      </div>
      <div className="skeleton h-72" />
    </div>
  );
}
