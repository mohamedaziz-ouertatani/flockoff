"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createProductAction, updateProductAction } from "@/lib/actions/admin/products";
import { slugify } from "@/lib/format";
import { SIZES } from "@/lib/validation/admin";
import { cn } from "@/lib/utils";

type Size = (typeof SIZES)[number];
type Option = { id: string; name: string };
type VariantRow = { size: Size; stock: string; expectedStock: number | null };

export type ProductFormValues = {
  name: string;
  slug: string;
  price: string; // TND, as typed
  categoryId: string;
  collectionId: string;
  description: string;
  isFeatured: boolean;
  isActive: boolean;
  variants: { size: Size; stock: number }[];
};

const selectCls =
  "h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return msg ? (
    <p id={id} className="text-sm text-destructive">
      {msg}
    </p>
  ) : null;
}

export function ProductForm({
  mode,
  productId,
  initial,
  categories,
  collections,
}: {
  mode: "create" | "edit";
  productId?: string;
  initial: ProductFormValues;
  categories: Option[];
  collections: Option[];
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [rows, setRows] = useState<VariantRow[]>(
    initial.variants.map((x) => ({ size: x.size, stock: String(x.stock), expectedStock: mode === "edit" ? x.stock : null })),
  );
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const set = <K extends keyof ProductFormValues>(k: K, value: ProductFormValues[K]) => {
    setV((prev) => ({ ...prev, [k]: value }));
    setErrors((e) => ({ ...e, [k]: "" }));
    setMessage(null);
  };

  const unusedSizes = SIZES.filter((s) => !rows.some((r) => r.size === s));

  function addSize(size: Size) {
    // Keep rows in size order (XS..XXL).
    setRows((r) => [...r, { size, stock: "0", expectedStock: null }].sort((a, b) => SIZES.indexOf(a.size) - SIZES.indexOf(b.size)));
    setMessage(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const variantErrors: Record<string, string> = {};
    const variants = rows.map((r) => {
      const n = Number(r.stock);
      if (r.stock.trim() === "" || !Number.isInteger(n) || n < 0) variantErrors[`stock-${r.size}`] = "Whole number, 0 or more";
      return { size: r.size, stock: n, expectedStock: r.expectedStock };
    });
    if (Object.keys(variantErrors).length > 0) {
      setErrors(variantErrors);
      setMessage({ kind: "error", text: "Fix the stock values highlighted below." });
      return;
    }

    const payload = { ...v, variants };
    startTransition(async () => {
      const showError = (r: { error?: string; fieldErrors?: Record<string, string> }) => {
        setErrors(r.fieldErrors ?? {});
        setMessage({ kind: "error", text: r.error ?? "Couldn't save." });
      };
      if (mode === "create") {
        const res = await createProductAction(payload);
        if (!res.ok) return showError(res);
        router.push(`/admin/products/${res.data.id}?created=1`);
        return;
      }
      const res = await updateProductAction(productId, payload);
      if (!res.ok) return showError(res);
      // Saved stock becomes the new baseline for the next edit's conflict check.
      setRows((r) => r.map((x) => ({ ...x, expectedStock: Number(x.stock) })));
      setMessage({ kind: "ok", text: "Saved." });
      router.refresh();
    });
  }

  const err = (k: string) => errors[k] || undefined;

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <fieldset disabled={pending} className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="p-name">Name</Label>
          <Input
            id="p-name"
            value={v.name}
            onChange={(e) => {
              set("name", e.target.value);
              if (!slugTouched) setV((prev) => ({ ...prev, name: e.target.value, slug: slugify(e.target.value) }));
            }}
            aria-invalid={!!err("name")}
            aria-describedby="p-name-err"
            className="h-10"
          />
          <FieldError id="p-name-err" msg={err("name")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-slug">Slug</Label>
          <Input
            id="p-slug"
            value={v.slug}
            onChange={(e) => {
              setSlugTouched(true);
              set("slug", e.target.value);
            }}
            aria-invalid={!!err("slug")}
            aria-describedby="p-slug-hint p-slug-err"
            className="h-10 font-mono text-sm"
          />
          <p id="p-slug-hint" className="text-xs text-muted-foreground">
            /product/{v.slug || "…"}
          </p>
          <FieldError id="p-slug-err" msg={err("slug")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-price">Price (TND)</Label>
          <Input
            id="p-price"
            inputMode="decimal"
            value={v.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="180"
            aria-invalid={!!err("price")}
            aria-describedby="p-price-err"
            className="h-10 tabular-nums"
          />
          <FieldError id="p-price-err" msg={err("price")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-category">Category</Label>
          <select
            id="p-category"
            value={v.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            aria-invalid={!!err("categoryId")}
            className={selectCls}
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <FieldError id="p-category-err" msg={err("categoryId")} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-collection">Collection</Label>
          <select id="p-collection" value={v.collectionId} onChange={(e) => set("collectionId", e.target.value)} className={selectCls}>
            <option value="">None</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="p-description">Description</Label>
          <Textarea
            id="p-description"
            rows={4}
            value={v.description}
            onChange={(e) => set("description", e.target.value)}
            aria-invalid={!!err("description")}
            aria-describedby="p-description-err"
          />
          <FieldError id="p-description-err" msg={err("description")} />
        </div>

        <div className="flex flex-wrap gap-8 sm:col-span-2">
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.isActive} onCheckedChange={(c) => set("isActive", c)} />
            <span>
              <span className="font-medium">Active</span>
              <span className="block text-xs text-muted-foreground">Visible in the shop</span>
            </span>
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.isFeatured} onCheckedChange={(c) => set("isFeatured", c)} />
            <span>
              <span className="font-medium">Featured</span>
              <span className="block text-xs text-muted-foreground">Shown on the home page</span>
            </span>
          </label>
        </div>
      </fieldset>

      <fieldset disabled={pending} className="rounded-lg border p-4">
        <legend className="px-1 text-sm font-medium">Sizes & stock</legend>
        {rows.length === 0 && <p className="mb-3 text-sm text-muted-foreground">No sizes yet. Customers can&apos;t buy this until you add one.</p>}
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const k = `stock-${r.size}`;
            return (
              <li key={r.size} className="flex items-start gap-3">
                <span className="mt-2 w-10 text-sm font-semibold">{r.size}</span>
                <div className="flex flex-col gap-1">
                  <Input
                    aria-label={`Stock for size ${r.size}`}
                    inputMode="numeric"
                    value={r.stock}
                    onChange={(e) => {
                      const stock = e.target.value.replace(/[^\d]/g, "").slice(0, 5);
                      setRows((all) => all.map((x) => (x.size === r.size ? { ...x, stock } : x)));
                      setErrors((x) => ({ ...x, [k]: "" }));
                      setMessage(null);
                    }}
                    aria-invalid={!!err(k)}
                    className={cn("h-9 w-24 tabular-nums")}
                  />
                  <FieldError id={`${k}-err`} msg={err(k)} />
                </div>
                {r.expectedStock !== null && Number(r.stock) !== r.expectedStock && (
                  <span className="mt-2 text-xs text-muted-foreground">was {r.expectedStock}</span>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ml-auto"
                  onClick={() => setRows((all) => all.filter((x) => x.size !== r.size))}
                  aria-label={`Remove size ${r.size}`}
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ul>
        {unusedSizes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">Add size:</span>
            {unusedSizes.map((s) => (
              <Button key={s} type="button" variant="outline" size="sm" onClick={() => addSize(s)}>
                <PlusIcon /> {s}
              </Button>
            ))}
          </div>
        )}
        {errors.variants && <p className="mt-2 text-sm text-destructive">{errors.variants}</p>}
      </fieldset>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </Button>
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={cn("text-sm", message.kind === "error" ? "text-destructive" : "text-emerald-700")}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
