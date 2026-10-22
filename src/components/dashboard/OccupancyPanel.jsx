import AnimatedNumber from "../common/AnimatedNumber";
import { SectionTitle, Skeleton } from "../common/PageHeader";

/**
 * Live occupancy: the count animates as vehicles come and go, and the bar marks
 * the alert threshold so you can see how close the facility is to it.
 */
export default function OccupancyPanel({ inside, capacity, threshold, loading = false, className = "", children }) {
  const percent = capacity ? Math.min(100, Math.round((inside / capacity) * 100)) : 0;
  const full = capacity > 0 && inside >= capacity;
  const high = percent >= threshold;
  const free = Math.max(0, capacity - inside);

  const state = full
    ? { label: "Full — entries are refused", bar: "bg-red-500", text: "text-red-300" }
    : high
      ? { label: `Above the ${threshold}% alert threshold`, bar: "bg-amber-400", text: "text-amber-300" }
      : { label: `${free} space${free === 1 ? "" : "s"} free`, bar: "bg-lime-300", text: "text-lime-300" };

  return (
    // A column so that, when the grid stretches the card, the number centres in the
    // spare height and the bar settles on the bottom edge instead of leaving a gap.
    <section className={`glass-card flex flex-col ${className}`}>
      <div className="flex items-baseline justify-between gap-4">
        <SectionTitle>Occupancy</SectionTitle>
        {!loading && <span className={`text-xs font-medium ${state.text}`}>{state.label}</span>}
      </div>

      <div className="flex flex-1 items-center gap-3 py-5">
        {loading ? (
          <Skeleton className="h-12 w-36" />
        ) : (
          <p className="text-5xl font-semibold leading-none tracking-tight text-zinc-100">
            <AnimatedNumber value={inside} />
            <span className="text-2xl text-zinc-600"> / {capacity}</span>
          </p>
        )}
        {!loading && <span className="self-end pb-1 font-mono text-sm tabular-nums text-zinc-500">{percent}%</span>}
      </div>

      <div className="relative">
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${state.bar}`}
            style={{ width: `${loading ? 0 : percent}%` }}
          />
        </div>
        {/* Threshold marker */}
        <span
          aria-hidden
          className="absolute -top-1 h-4 w-px bg-zinc-400"
          style={{ left: `${Math.min(100, threshold)}%` }}
        />
        <div className="relative mt-2 flex justify-between font-mono text-[10px] text-zinc-600">
          <span>0</span>
          <span>{capacity}</span>
          {/* Hidden near the ends, where it would collide with 0 / capacity */}
          {threshold > 12 && threshold < 88 && (
            <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${threshold}%` }}>
              alert {threshold}%
            </span>
          )}
        </div>
      </div>

      {children}
    </section>
  );
}
