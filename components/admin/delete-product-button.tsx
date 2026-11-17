"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProductAction } from "@/lib/actions/admin/products";

export function DeleteProductButton({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" className="text-destructive" onClick={() => setConfirming(true)}>
        <Trash2Icon /> Delete product
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
      <p>
        Permanently delete <span className="font-semibold">{name}</span>, its sizes and images? Past orders keep their item
        details. To just hide it from the shop, switch off <span className="font-medium">Active</span> instead.
      </p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await deleteProductAction(productId);
              if (!res.ok) return setError(res.error ?? "Couldn't delete.");
              router.push("/admin/products");
            })
          }
        >
          {pending ? "Deleting…" : "Yes, delete permanently"}
        </Button>
        <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
      </div>
      {error && <p role="alert" className="text-destructive">{error}</p>}
    </div>
  );
}
