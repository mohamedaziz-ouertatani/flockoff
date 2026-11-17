import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6" aria-busy="true" aria-label="Loading products">
      <div className="flex items-end justify-between border-b pb-6">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="mt-8 grid gap-10 md:grid-cols-[13rem_1fr]">
        <div className="hidden flex-col gap-3 md:flex">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i} className="flex flex-col gap-3">
              <Skeleton className="aspect-[5/6] w-full" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-20" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
