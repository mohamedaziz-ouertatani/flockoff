import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Loading product">
      <Skeleton className="mb-6 h-3 w-48" />
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <Skeleton className="aspect-[5/6] w-full" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-6 w-28" />
          <div className="mt-6 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-11 w-14" />
            ))}
          </div>
          <Skeleton className="mt-4 h-11 w-36" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
