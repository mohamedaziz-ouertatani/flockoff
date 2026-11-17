"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTaxonomyAction, deleteTaxonomyAction, updateTaxonomyAction } from "@/lib/actions/admin/taxonomy";
import { slugify } from "@/lib/format";

type Kind = "category" | "collection";
type Item = { id: string; name: string; slug: string; productCount: number };
type Errors = { name?: string; slug?: string; form?: string };

function NameSlugFields({
  name,
  slug,
  onName,
  onSlug,
  errors,
  idPrefix,
}: {
  name: string;
  slug: string;
  onName: (v: string) => void;
  onSlug: (v: string) => void;
  errors: Errors;
  idPrefix: string;
}) {
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <div>
        <Input id={`${idPrefix}-name`} aria-label="Name" placeholder="Name" value={name} onChange={(e) => onName(e.target.value)} aria-invalid={!!errors.name} className="h-9" />
        {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name}</p>}
      </div>
      <div>
        <Input aria-label="Slug" placeholder="slug" value={slug} onChange={(e) => onSlug(e.target.value)} aria-invalid={!!errors.slug} className="h-9 font-mono text-sm" />
        {errors.slug && <p className="mt-1 text-xs text-destructive">{errors.slug}</p>}
      </div>
    </div>
  );
}

function Row({ kind, item }: { kind: Kind; item: Item }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(item.name);
  const [slug, setSlug] = useState(item.slug);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  const save = () =>
    startTransition(async () => {
      const res = await updateTaxonomyAction(kind, item.id, { name, slug });
      if (!res.ok) return setErrors({ ...res.fieldErrors, form: res.fieldErrors ? undefined : res.error });
      setEditing(false);
      setErrors({});
      router.refresh();
    });

  const remove = () =>
    startTransition(async () => {
      const res = await deleteTaxonomyAction(kind, item.id);
      if (!res.ok) {
        setConfirmDelete(false);
        return setErrors({ form: res.error });
      }
      router.refresh();
    });

  return (
    <li className="flex flex-col gap-2 py-3">
      {editing ? (
        <div className="flex flex-wrap items-start gap-2">
          <NameSlugFields name={name} slug={slug} onName={setName} onSlug={setSlug} errors={errors} idPrefix={item.id} />
          <Button size="sm" onClick={save} disabled={pending}>
            Save
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setEditing(false);
              setName(item.name);
              setSlug(item.slug);
              setErrors({});
            }}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.name}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {item.slug} · {item.productCount} {item.productCount === 1 ? "product" : "products"}
            </p>
          </div>
          <Button size="icon" variant="ghost" onClick={() => setEditing(true)} aria-label={`Rename ${item.name}`}>
            <PencilIcon />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${item.name}`}>
            <Trash2Icon />
          </Button>
        </div>
      )}
      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
          <span className="flex-1">
            Delete <span className="font-medium">{item.name}</span>?
            {kind === "collection" && item.productCount > 0 && ` Its ${item.productCount} products stay in the shop without a collection.`}
          </span>
          <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={pending}>
            Cancel
          </Button>
        </div>
      )}
      {errors.form && (
        <p role="alert" className="text-sm text-destructive">
          {errors.form}
        </p>
      )}
    </li>
  );
}

function AddForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex flex-wrap items-start gap-2 border-t pt-4"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await createTaxonomyAction(kind, { name, slug });
          if (!res.ok) return setErrors({ ...res.fieldErrors, form: res.fieldErrors ? undefined : res.error });
          setName("");
          setSlug("");
          setSlugTouched(false);
          setErrors({});
          router.refresh();
        });
      }}
    >
      <NameSlugFields
        idPrefix={`new-${kind}`}
        name={name}
        slug={slug}
        onName={(v) => {
          setName(v);
          if (!slugTouched) setSlug(slugify(v));
        }}
        onSlug={(v) => {
          setSlugTouched(true);
          setSlug(v);
        }}
        errors={errors}
      />
      <Button type="submit" size="sm" disabled={pending}>
        <PlusIcon /> Add
      </Button>
      {errors.form && <p className="w-full text-sm text-destructive">{errors.form}</p>}
    </form>
  );
}

export function TaxonomyManager({ kind, items }: { kind: Kind; items: Item[] }) {
  return (
    <div>
      {items.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">None yet.</p>
      ) : (
        <ul className="divide-y">
          {items.map((i) => (
            // Key includes name/slug so a row resets its draft after a refresh.
            <Row key={`${i.id}:${i.name}:${i.slug}`} kind={kind} item={i} />
          ))}
        </ul>
      )}
      <AddForm kind={kind} />
    </div>
  );
}
