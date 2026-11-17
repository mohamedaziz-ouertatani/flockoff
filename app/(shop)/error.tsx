"use client";

import { ErrorState } from "@/components/error-state";

export default function ShopError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState error={error} reset={reset} title="Something broke" />;
}
