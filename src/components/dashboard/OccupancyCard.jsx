export default function OccupancyCard({ current, maximum, threshold }) {
  const percent = maximum ? Math.min(100, Math.round((current / maximum) * 100)) : 0;
  const isHigh = percent >= threshold;
  return (
    <div className="glass-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Current Occupancy
          </p>
          <p className="mt-2 text-4xl font-black tracking-tight text-zinc-100">
            {current}
            <span className="text-zinc-600">/{maximum}</span>
          </p>
        </div>
        <div
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${
            isHigh
              ? "bg-red-500/15 text-red-300"
              : "bg-lime-400/15 text-lime-300"
          }`}
        >
          {percent}% occupied
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/8">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isHigh ? "bg-red-500" : "bg-violet-500"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-zinc-600">
        Alert threshold: {threshold}%
      </p>
    </div>
  );
}
