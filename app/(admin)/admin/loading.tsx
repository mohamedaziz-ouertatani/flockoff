import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="rounded-lg border bg-background p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="mb-3 h-10 w-full last:mb-0" />
        ))}
      </div>
    </div>
  );
}
