"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { ArrowDownIcon, ArrowUpIcon, ImagePlusIcon, Trash2Icon } from "lucide-react";
import { ProductImage } from "@/components/shop/product-image";
import { Button } from "@/components/ui/button";
import {
  deleteProductImageAction,
  moveProductImageAction,
  uploadProductImageAction,
} from "@/lib/actions/admin/products";

type Img = { id: string; url: string };

export function ImageManager({ productId, images }: { productId: string; images: Img[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setErrors([]);
    const list = [...files];
    startTransition(async () => {
      const failed: string[] = [];
      for (const [i, file] of list.entries()) {
        setProgress(`Uploading ${i + 1} of ${list.length}…`);
        const fd = new FormData();
        fd.set("productId", productId);
        fd.set("file", file);
        const res = await uploadProductImageAction(fd).catch(() => ({ ok: false as const, error: `${file.name}: upload failed.` }));
        if (!res.ok) failed.push(res.error ?? `${file.name}: upload failed.`);
      }
      setProgress(null);
      setErrors(failed);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setErrors([]);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) setErrors([res.error ?? "Something went wrong."]);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">No images yet. The first image is the one shown in the shop grid.</p>
      ) : (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy={pending}>
          {images.map((img, i) => (
            <li key={img.id} className="group flex flex-col gap-2">
              <div className="relative aspect-[5/6] overflow-hidden rounded-md border bg-muted">
                <ProductImage src={img.url} alt={`Image ${i + 1}`} fill sizes="200px" />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 rounded-sm bg-foreground px-1.5 py-0.5 text-[10px] font-semibold text-background uppercase">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending || i === 0}
                    onClick={() => run(() => moveProductImageAction(img.id, "up"))}
                    aria-label={`Move image ${i + 1} earlier`}
                  >
                    <ArrowUpIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={pending || i === images.length - 1}
                    onClick={() => run(() => moveProductImageAction(img.id, "down"))}
                    aria-label={`Move image ${i + 1} later`}
                  >
                    <ArrowDownIcon />
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  disabled={pending}
                  onClick={() => {
                    if (confirm("Delete this image? This can't be undone.")) run(() => deleteProductImageAction(img.id));
                  }}
                  aria-label={`Delete image ${i + 1}`}
                >
                  <Trash2Icon />
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="sr-only"
          id="image-upload"
          onChange={(e) => upload(e.target.files)}
          disabled={pending}
        />
        <Button asChild variant="outline" disabled={pending}>
          <label htmlFor="image-upload" className="cursor-pointer">
            <ImagePlusIcon /> Upload images
          </label>
        </Button>
        <span className="text-xs text-muted-foreground">{progress ?? "JPEG, PNG, WebP or AVIF · max 5 MB each"}</span>
      </div>
      {errors.length > 0 && (
        <ul role="alert" className="text-sm text-destructive">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
