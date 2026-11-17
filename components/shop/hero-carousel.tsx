"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductImage } from "./product-image";

export type HeroSlide = {
  id: string;
  eyebrow: string;
  title: string;
  href: string;
  cta: string;
  bg: string; // css color
  fg: string;
  imageUrl: string | null;
  imageAlt: string;
};

const INTERVAL_MS = 6000;

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // hover / focus
  const [stopped, setStopped] = useState(false); // user pressed pause, or reduced motion
  const count = slides.length;
  const regionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setStopped(true);
  }, []);

  const go = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || stopped || count < 2) return;
    const t = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [index, paused, stopped, count, go]);

  if (count === 0) return null;

  return (
    <section
      ref={regionRef}
      aria-roledescription="carousel"
      aria-label="Collections"
      className="relative overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!regionRef.current?.contains(e.relatedTarget as Node)) setPaused(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") go(index - 1);
        if (e.key === "ArrowRight") go(index + 1);
      }}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${index * 100}%)` }}
        aria-live={stopped ? "polite" : "off"}
      >
        {slides.map((s, i) => (
          <div
            key={s.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${s.title}`}
            aria-hidden={i !== index}
            inert={i !== index}
            className="w-full shrink-0"
            style={{ backgroundColor: s.bg, color: s.fg }}
          >
            <div className="mx-auto grid min-h-[30rem] max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 md:min-h-[36rem] md:grid-cols-[1.2fr_1fr]">
              <div className="flex flex-col items-start gap-5">
                <span className="text-xs font-semibold tracking-[0.25em] uppercase opacity-70">{s.eyebrow}</span>
                <h2 className="font-display text-6xl leading-[0.9] tracking-wide uppercase sm:text-7xl lg:text-8xl">
                  {s.title}
                </h2>
                <Link
                  href={s.href}
                  className="mt-2 border-2 border-current px-6 py-3 text-sm font-semibold tracking-widest uppercase transition-colors hover:bg-[var(--hero-fg)] hover:text-[var(--hero-bg)]"
                  style={{ ["--hero-fg" as string]: s.fg, ["--hero-bg" as string]: s.bg }}
                >
                  {s.cta}
                </Link>
              </div>
              <div className="relative mx-auto hidden aspect-[5/6] w-full max-w-sm md:block">
                <ProductImage
                  src={s.imageUrl}
                  alt={s.imageAlt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 768px) 24rem, 0px"
                  className="shadow-2xl"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-4">
          <div
            className="mx-auto flex max-w-7xl items-center gap-2 px-4 sm:px-6"
            style={{ color: slides[index].fg }}
          >
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Previous slide"
              className="grid size-9 place-items-center border border-current/40 hover:border-current"
            >
              <ChevronLeftIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="grid size-9 place-items-center border border-current/40 hover:border-current"
            >
              <ChevronRightIcon className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setStopped((s) => !s)}
              aria-label={stopped ? "Play slideshow" : "Pause slideshow"}
              className="grid size-9 place-items-center border border-current/40 hover:border-current"
            >
              {stopped ? <PlayIcon className="size-4" /> : <PauseIcon className="size-4" />}
            </button>
            <div className="ml-3 flex gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "h-1 w-8 bg-current transition-opacity",
                    i === index ? "opacity-100" : "opacity-30 hover:opacity-60",
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
