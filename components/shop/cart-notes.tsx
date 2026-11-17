import { InfoIcon, XIcon } from "lucide-react";

export function CartNotes({ notes, onDismiss }: { notes: string[]; onDismiss?: () => void }) {
  if (notes.length === 0) return null;
  return (
    <div role="status" className="relative flex gap-3 border border-brand/40 bg-brand/5 p-4 text-sm">
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
      <div className="flex flex-col gap-1">
        <p className="font-medium">Your cart was updated</p>
        <ul className="list-disc pl-4 text-muted-foreground">
          {notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="absolute top-3 right-3">
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
