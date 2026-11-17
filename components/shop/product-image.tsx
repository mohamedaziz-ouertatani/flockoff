import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils";

type Props = Omit<ImageProps, "src" | "alt"> & { src: string | null; alt: string };

/**
 * Product image with a fixed 5:6 frame. Our own /placeholder SVGs skip the optimizer
 * (it doesn't rasterise SVG); real uploaded images go through next/image normally.
 */
export function ProductImage({ src, alt, className, ...rest }: Props) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted text-xs tracking-widest text-muted-foreground uppercase",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        No image
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      unoptimized={src.startsWith("/placeholder/")}
      className={cn("h-full w-full object-cover", className)}
      {...rest}
    />
  );
}
