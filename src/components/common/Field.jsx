// Same field treatment as the sign-in and gate screens.
const control =
  "h-10 w-full rounded-lg border border-white/10 bg-[var(--bg)] px-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 hover:border-white/20 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20 disabled:cursor-not-allowed disabled:opacity-60";

export function Input({ label, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-zinc-400">
      {label}
      <input className={`${control} ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-zinc-400">
      {label}
      <select className={`${control} pr-8 ${className}`} {...props}>
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-[13px] font-medium text-zinc-400">
      {label}
      <textarea className={`${control} h-auto resize-none py-2.5 ${className}`} {...props} />
    </label>
  );
}

/** A row of mutually exclusive choices, for filters with only a few options. */
export function Segmented({ label, value, onChange, options }) {
  return (
    <div className="grid gap-1.5">
      {label && <span className="text-[13px] font-medium text-zinc-400">{label}</span>}
      <div role="radiogroup" aria-label={label} className="inline-flex w-fit rounded-lg border border-white/10 p-0.5">
        {options.map(([optionValue, optionLabel]) => {
          const selected = value === optionValue;
          return (
            <button
              key={optionValue || "all"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(optionValue)}
              className={`h-8 rounded-md px-3 text-xs font-medium transition ${
                selected ? "bg-zinc-100 text-zinc-950" : "text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
