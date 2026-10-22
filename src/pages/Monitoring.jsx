import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Car } from "lucide-react";
import AnimatedNumber from "../components/common/AnimatedNumber";
import PageHeader, { EmptyState, SectionTitle, Skeleton } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import LiveFeed from "../components/dashboard/LiveFeed";
import OccupancyPanel from "../components/dashboard/OccupancyPanel";
import { useApp } from "../state/AppContext";
import { belongsTo, formatMinutes, gateEvents, getDashboardStats, minutesSince } from "../services/dashboardService";

export default function Monitoring() {
  const { vehicles, movements, alerts, configuration, loading, syncedAt, syncError } = useApp();
  // Re-render every minute so "time inside" keeps counting between data changes.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const stats = getDashboardStats(vehicles, movements, alerts, configuration);

  const insideRows = useMemo(
    () =>
      vehicles
        .filter((v) => v.currentStatus === "INSIDE")
        .map((v) => {
          // Movements are newest first, so this is the entry that is still open.
          const entry = movements.find((m) => belongsTo(m, v) && m.type === "ENTRY" && !m.exitTime);
          const minutes = entry ? minutesSince(entry.entryTime) : null;
          return { ...v, entryTime: entry?.entryTime, gate: entry?.gate, minutes };
        })
        .sort((a, b) => (b.minutes ?? 0) - (a.minutes ?? 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [vehicles, movements, tick]
  );

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={
          syncError ? (
            <span className="text-amber-400">Live updates interrupted</span>
          ) : (
            <>
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime-400" />
              Live{syncedAt && <span className="text-zinc-500">· synced {syncedAt.toLocaleTimeString("en-IN", { hour12: false })}</span>}
            </>
          )
        }
        accent="text-lime-300"
        title="Monitoring"
        description="Who is on site right now, and everything happening at the gates."
      />

      <OccupancyPanel
        inside={stats.currentOccupancy}
        capacity={stats.maximumCapacity}
        threshold={Number(configuration.alertThreshold) || 80}
        loading={loading}
      >
        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.06] pt-5 sm:grid-cols-4">
          {[
            ["Inside", stats.vehiclesInside],
            ["Spaces free", Math.max(0, stats.maximumCapacity - stats.currentOccupancy)],
            ["Entries today", stats.todayEntries],
            ["Exits today", stats.todayExits],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</dt>
              <dd className="mt-1 text-xl font-semibold tabular-nums text-zinc-100">
                {loading ? <Skeleton className="mt-1 h-6 w-10" /> : <AnimatedNumber value={value} />}
              </dd>
            </div>
          ))}
        </dl>
      </OccupancyPanel>

      {/* Two equal panels that scroll inside themselves, so neither column trails off */}
      <div className="grid gap-6 lg:h-[520px] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="glass-card flex min-h-0 flex-col p-0!">
          <SectionTitle className="px-5 pb-3 pt-5">Vehicles inside · {insideRows.length}</SectionTitle>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.06]">
            <Table
              bare
              loading={loading}
              columns={[
                {
                  key: "regNo",
                  label: "Vehicle",
                  render: (row) => (
                    <Link to={`/vehicles/${row.id}`} className="font-mono font-semibold tracking-wider text-zinc-100 hover:underline">
                      {row.regNo}
                    </Link>
                  ),
                },
                { key: "owner", label: "Owner" },
                { key: "gate", label: "Gate" },
                {
                  key: "entryTime",
                  label: "Entered",
                  render: (row) => <span className="font-mono text-xs text-zinc-400">{row.entryTime?.slice(11, 16) || "—"}</span>,
                },
                {
                  key: "minutes",
                  label: "On site",
                  render: (row) => <span className="font-mono text-xs tabular-nums text-zinc-200">{formatMinutes(row.minutes)}</span>,
                },
              ]}
              rows={insideRows}
              empty={
                <EmptyState icon={Car} title="The facility is empty">
                  Vehicles appear here from the moment their entry is recorded.
                </EmptyState>
              }
            />
          </div>
        </section>

        <section className="glass-card flex min-h-0 flex-col p-0!">
          <SectionTitle className="px-5 pb-3 pt-5">Gate activity</SectionTitle>
          <div className="min-h-0 flex-1 overflow-y-auto border-t border-white/[0.06] px-3 py-2">
            <LiveFeed events={gateEvents(movements, alerts, 20)} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}
