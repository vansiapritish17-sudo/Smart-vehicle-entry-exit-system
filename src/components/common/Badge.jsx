const toneMap = {
  /* Status */
  ACTIVE:      "bg-lime-400/15 text-lime-300 ring-lime-400/20",
  INACTIVE:    "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20",
  INSIDE:      "bg-violet-500/15 text-violet-300 ring-violet-500/20",
  OUTSIDE:     "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20",
  /* Movement */
  ENTRY:       "bg-violet-500/15 text-violet-300 ring-violet-500/20",
  EXIT:        "bg-sky-500/15 text-sky-300 ring-sky-500/20",
  /* Alert severity */
  HIGH:        "bg-red-500/15 text-red-300 ring-red-500/20",
  MEDIUM:      "bg-amber-500/15 text-amber-300 ring-amber-500/20",
  LOW:         "bg-sky-500/15 text-sky-300 ring-sky-500/20",
  /* Alert status */
  OPEN:        "bg-amber-500/15 text-amber-300 ring-amber-500/20",
  RESOLVED:    "bg-lime-400/15 text-lime-300 ring-lime-400/20",
  /* Vehicle */
  VALID:       "bg-lime-400/15 text-lime-300 ring-lime-400/20",
  MAINTENANCE: "bg-amber-500/15 text-amber-300 ring-amber-500/20",
};

export default function Badge({ children, tone }) {
  const cls = toneMap[tone ?? children] ?? "bg-zinc-500/15 text-zinc-400 ring-zinc-500/20";
  return (
    <span
      className={`inline-flex whitespace-nowrap items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${cls}`}
    >
      {children}
    </span>
  );
}
