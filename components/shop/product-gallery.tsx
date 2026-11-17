"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

export function ProductGallery({ images, name }: { images: { id: string; url: string }[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 md:flex-col" aria-label="Product images">
          {images.map((img, i) => (
            <li key={img.id}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show image ${i + 1} of ${images.length}`}
                aria-current={i === active}
                className={cn(
                  "relative block aspect-[5/6] w-16 overflow-hidden bg-muted ring-offset-2 ring-offset-background transition md:w-20",
                  i === active ? "ring-2 ring-foreground" : "opacity-60 hover:opacity-100",
                )}
              >
                <ProductImage src={img.url} alt="" fill sizes="80px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-[5/6] w-full overflow-hidden bg-muted">
        <ProductImage
          src={current?.url ?? null}
          alt={images.length > 1 ? `${name}, image ${active + 1} of ${images.length}` : name}
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
        />
      </div>
    </div>
  );
}
