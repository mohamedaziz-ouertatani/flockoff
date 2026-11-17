"use client";

import { useEffect, useRef, useState } from "react";
import { getCartSnapshot } from "@/lib/actions/cart";
import { useCart } from "./store";

/**
 * After the cart hydrates, refresh every line from the server once (price, stock, availability)
 * and return notes about anything that changed. `synced` flips true when done.
 */
export function useCartSync() {
  const hydrated = useCart((s) => s.hydrated);
  const [notes, setNotes] = useState<string[]>([]);
  const [synced, setSynced] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (!hydrated || ran.current) return;
    ran.current = true;
    const ids = useCart.getState().lines.map((l) => l.variantId);
    if (ids.length === 0) {
      setSynced(true);
      return;
    }
    getCartSnapshot(ids)
      .then((snapshots) => setNotes(useCart.getState().reconcile(snapshots)))
      .catch(() => setNotes(["We couldn't refresh stock right now. It will be checked again at checkout."]))
      .finally(() => setSynced(true));
  }, [hydrated]);

  return { hydrated, synced, notes, setNotes };
}
