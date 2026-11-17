"use client";

import { useEffect, useId, useState } from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { clampQuantity } from "@/lib/stock";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  max: number; // available stock
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
  className?: string;
  "aria-describedby"?: string;
};

/** - [ n ] +  stepper that can never go below 1 or above `max`, whether clicked or typed. */
export function QuantityStepper({ value, max, onChange, disabled, label = "Quantity", className, ...aria }: Props) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const atMin = value <= 1;
  const atMax = value >= max;
  const btn =
    "grid size-11 place-items-center transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-35";

  function commit(raw: string) {
    const next = clampQuantity(Number.parseInt(raw, 10), max) || 1;
    setDraft(String(next));
    if (next !== value) onChange(next);
  }

  return (
    <div className={cn("inline-flex items-center border", disabled && "opacity-50", className)}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clampQuantity(value - 1, max))}
        disabled={disabled || atMin}
        aria-label="Decrease quantity"
      >
        <MinusIcon className="size-4" />
      </button>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          // Clamp as the user types so the box never shows more than is in stock.
          // An empty box is allowed mid-edit; blur turns it back into a real number.
          const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
          if (digits === "") return setDraft("");
          const next = clampQuantity(Number.parseInt(digits, 10), max) || 1;
          setDraft(String(next));
          if (next !== value) onChange(next);
        }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(e.currentTarget.value);
          }
        }}
        aria-describedby={aria["aria-describedby"]}
        className="h-11 w-12 border-x bg-transparent text-center tabular-nums outline-none"
      />
      <button
        type="button"
        className={btn}
        onClick={() => onChange(clampQuantity(value + 1, max))}
        disabled={disabled || atMax}
        aria-label="Increase quantity"
      >
        <PlusIcon className="size-4" />
      </button>
    </div>
  );
}
