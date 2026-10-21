import { useEffect, useMemo, useState } from "react";
import Badge from "../components/common/Badge";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { formatMinutes, getDashboardStats, minutesSince } from "../services/dashboardService";

export default function Monitoring() {
  const { vehicles, movements, alerts, configuration, syncedAt, syncError } = useApp();
  // Re-render every minute so "time inside" keeps counting between data changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const stats = getDashboardStats(vehicles, movements, alerts, configuration);
  const occupancyPercent = stats.maximumCapacity
    ? Math.min(100, Math.round((stats.currentOccupancy / stats.maximumCapacity) * 100))
    : 0;
  const isHigh = occupancyPercent >= configuration.alertThreshold;

  const insideRows = useMemo(
    () =>
      vehicles
        .filter((v) => v.currentStatus === "INSIDE")
        .map((v) => {
          // Movements are newest first, so this is the entry that is still open.
          const entry = movements.find(
            (m) => m.regNo === v.regNo && m.type === "ENTRY" && !m.exitTime
          );
          return {
            ...v,
            entryTime: entry?.entryTime || "—",
            gate: entry?.gate || "—",
            duration: entry ? formatMinutes(minutesSince(entry.entryTime)) : "—",
          };
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, movements, tick]
  );

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Live Monitoring</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Real-time occupancy and vehicle tracking
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncError ? (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
              {syncError}
            </span>
          ) : (
            <span className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-500">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime-400" />
              Live · last update {syncedAt ? syncedAt.toLocaleTimeString("en-IN") : "—"}
            </span>
          )}
        </div>
      </div>

      {/* Occupancy card */}
      <div className="glass-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Occupancy
            </p>
            <p className="mt-2 text-4xl font-black tracking-tight text-zinc-100">
              {stats.currentOccupancy}
              <span className="text-zinc-600">/{stats.maximumCapacity}</span>
            </p>
          </div>
          <div
            className={`rounded-full px-4 py-2 text-sm font-bold ${
              isHigh
                ? "bg-red-500/15 text-red-300"
                : "bg-lime-400/15 text-lime-300"
            }`}
          >
            {occupancyPercent}% occupied
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              isHigh ? "bg-red-500" : "bg-violet-500"
            }`}
            style={{ width: `${occupancyPercent}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-center">
          {[
            { label: "Inside", value: stats.vehiclesInside, color: "text-violet-300" },
            { label: "Outside", value: stats.vehiclesOutside, color: "text-zinc-400" },
            { label: "Max Capacity", value: stats.maximumCapacity, color: "text-zinc-300" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-xs text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inside vehicles */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Vehicles Currently Inside
        </h2>
        <Table
          columns={[
            { key: "regNo", label: "Vehicle" },
            { key: "owner", label: "Owner" },
            { key: "entryTime", label: "Entry Time" },
            { key: "gate", label: "Gate" },
            { key: "duration", label: "Time Inside" },
            {
              key: "currentStatus",
              label: "Status",
              render: (row) => <Badge>{row.currentStatus}</Badge>,
            },
          ]}
          rows={insideRows}
          empty="No vehicles are inside right now."
        />
      </section>

      {/* Recent activity */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-zinc-400 uppercase tracking-widest">
          Recent Activity
        </h2>
        <Table
          columns={[
            { key: "regNo", label: "Vehicle" },
            {
              key: "type",
              label: "Movement",
              render: (row) => <Badge>{row.type}</Badge>,
            },
            { key: "gate", label: "Gate" },
            {
              key: "time",
              label: "Timestamp",
              render: (row) => (row.type === "ENTRY" ? row.entryTime : row.exitTime),
            },
          ]}
          rows={movements.slice(0, 10)}
          empty="No movements recorded yet."
        />
      </section>
    </div>
  );
}
