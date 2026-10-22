/**
 * The header every page opens with: a mono eyebrow, the title, an optional line
 * of context, and actions on the right. Shared so every screen reads as one product.
 */
export default function PageHeader({ eyebrow, title, description, actions, accent = "text-violet-400" }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className={`flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] ${accent}`}>
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Small mono heading for a section or card. */
export function SectionTitle({ children, as: Tag = "h2", className = "" }) {
  return (
    <Tag className={`font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500 ${className}`}>
      {children}
    </Tag>
  );
}

/** Mono, tracked registration number — the same treatment everywhere a plate appears. */
export function Plate({ children, className = "" }) {
  return <span className={`font-mono font-semibold tracking-wider text-zinc-100 ${className}`}>{children}</span>;
}

/** A considered empty state: what is missing and, where useful, what to do about it. */
export function EmptyState({ icon: Icon, title, children, className = "" }) {
  return (
    <div
      className={`grid place-items-center gap-2 rounded-xl border border-dashed border-white/[0.08] px-6 py-10 text-center ${className}`}
    >
      {Icon && (
        <span className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.05] text-zinc-500">
          <Icon size={16} />
        </span>
      )}
      <p className="text-sm font-medium text-zinc-300">{title}</p>
      {children && <p className="max-w-xs text-xs leading-relaxed text-zinc-500">{children}</p>}
    </div>
  );
}

/** Placeholder block shown while live data loads. */
export function Skeleton({ className = "" }) {
  return <span aria-hidden className={`skeleton block rounded-md ${className}`} />;
}
