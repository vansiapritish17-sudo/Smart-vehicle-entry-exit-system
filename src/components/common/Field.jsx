export function Input({ label, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
      {label}
      <input
        className={`rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 transition focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
      {label}
      <select
        className={`rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none transition focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-zinc-400">
      {label}
      <textarea
        className={`rounded-xl border border-white/8 bg-white/5 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 resize-none transition focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20 ${className}`}
        {...props}
      />
    </label>
  );
}
