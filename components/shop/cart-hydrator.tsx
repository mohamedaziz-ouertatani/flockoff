"use client";

import { useEffect } from "react";
import { useCart } from "@/lib/cart/store";

/** Loads the persisted cart from localStorage after mount, keeping SSR output stable. */
export function CartHydrator() {
  useEffect(() => {
    void useCart.persist.rehydrate();
    // Keep tabs in sync: a change in another tab updates this one.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "flockoff-cart") void useCart.persist.rehydrate();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
