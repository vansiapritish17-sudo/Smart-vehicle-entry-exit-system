import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "./Button";

/**
 * Modal confirmation for destructive actions. Focus starts on Cancel so a stray
 * Enter never confirms; Escape and the backdrop dismiss it while not busy.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel, busy = false, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  // Focus once on open, not on every re-render from live data.
  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={busy ? undefined : onCancel} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
        className="animate-fade-up relative w-full max-w-md rounded-2xl border border-white/10 bg-[var(--surface-2)] p-6 shadow-[var(--popover-shadow)]"
      >
        <div className="flex gap-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-500/15">
            <AlertTriangle size={18} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="font-bold text-zinc-100">{title}</h2>
            <div id="confirm-body" className="mt-2 text-sm leading-relaxed text-zinc-400">{children}</div>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
