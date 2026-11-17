"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

/** Shared body for error.tsx boundaries: no stack traces, a retry, and the digest for support. */
export function ErrorState({ error, reset, title }: { error: Error & { digest?: string }; reset: () => void; title: string }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-20 sm:px-6">
      <h1 className="font-display text-4xl tracking-wide uppercase">{title}</h1>
      <p className="text-muted-foreground">
        Something went wrong on our side. Try again; if it keeps happening, it&apos;s probably a temporary connection problem.
      </p>
      <Button onClick={reset}>Try again</Button>
      {error.digest && <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>}
    </div>
  );
}
