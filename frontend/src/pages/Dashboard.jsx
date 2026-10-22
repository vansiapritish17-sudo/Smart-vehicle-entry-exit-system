import { useEffect, useState } from "react";
import { ArrowRight, Car, DoorClosed, DoorOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AnimatedNumber from "../components/common/AnimatedNumber";
import PageHeader, { EmptyState, SectionTitle, Skeleton } from "../components/common/PageHeader";
import LiveFeed from "../components/dashboard/LiveFeed";
import OccupancyPanel from "../components/dashboard/OccupancyPanel";
import { useApp } from "../state/AppContext";
import { chartColors, useTheme } from "../state/theme";
import {
  belongsTo,
  chartDataFromMovements,
  eventTime,
  formatMinutes,
  gateEvents,
  getDashboardStats,
  minutesSince,
} from "../services/dashboardService";

const linkPrimary =
  "inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-100 px-3.5 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-200";
const linkSecondary =
  "inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3.5 text-sm font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/[0.06] hover:text-zinc-100";
const cardLink = "inline-flex items-center gap-1 text-xs font-medium text-zinc-400 transition hover:text-zinc-100";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs shadow-[var(--popover-shadow)]">
      <p className="mb-1 font-mono text-zinc-400">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-200">
          <span className="h-2 w-2 rounded-full" style={{ background: p.fill }} />
          {p.dataKey === "entries" ? "Entries" : "Exits"}
          <span className="ml-auto font-mono font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

function Tile({ label, value, sub, to, loading, tone = "text-zinc-100" }) {
  const body = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-14" />
      ) : (
        <p className={`mt-2 text-3xl font-semibold tracking-tight ${tone}`}>
          <AnimatedNumber value={value} />
        </p>
      )}
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </>
  );
  return to ? (
    <Link to={to} className="glass-card block">
      {body}
    </Link>
  ) : (
    <div className="glass-card">{body}</div>
  );
}

function SyncStatus({ syncedAt, syncError }) {
  if (syncError) return <span className="text-amber-400">Live updates interrupted</span>;
  return (
    <>
      <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime-400" />
      Live{syncedAt && <span className="text-zinc-500">· synced {syncedAt.toLocaleTimeString("en-IN", { hour12: false })}</span>}
    </>
  );
}

export default function Dashboard() {
  const { vehicles, movements, alerts, configuration, currentUser, loading, syncedAt, syncError } = useApp();
  const chart = chartColors[useTheme().theme];
  const stats = getDashboardStats(vehicles, movements, alerts, configuration);
  const chartData = chartDataFromMovements(movements);
  const events = gateEvents(movements, alerts, 8);
  const firstName = currentUser.name?.split(" ")[0] ?? "";

  // Keep "time on site" counting between data changes.
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const inside = vehicles
    .filter((v) => v.currentStatus === "INSIDE")
    .map((v) => {
      const entry = movements.find((m) => belongsTo(m, v) && m.type === "ENTRY" && !m.exitTime);
      return { ...v, gate: entry?.gate, since: entry ? minutesSince(entry.entryTime) : null };
    })
    .sort((a, b) => (b.since ?? 0) - (a.since ?? 0));

  const gates = configuration.gates.map((g) => g.name);
  // Six 4-hour windows across the day; each cell counts movements in that window.
  const hours = ["00", "04", "08", "12", "16", "20"];
  const heatCount = (gate, hour) =>
    movements.filter((m) => {
      const h = Number(eventTime(m).slice(11, 13));
      return m.gate === gate && h >= Number(hour) && h < Number(hour) + 4;
    }).length;
  const maxHeat = Math.max(1, ...gates.flatMap((gate) => hours.map((hour) => heatCount(gate, hour))));

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={<SyncStatus syncedAt={syncedAt} syncError={syncError} />}
        accent="text-lime-300"
        title={`Welcome back, ${firstName}`}
        description="Gate activity across the facility, updated as it happens."
        actions={
          <>
            <Link to="/movements/entry" id="btn-record-entry" className={linkPrimary}>
              <DoorOpen size={15} /> Record entry
            </Link>
            <Link to="/movements/exit" id="btn-record-exit" className={linkSecondary}>
              <DoorClosed size={15} /> Record exit
            </Link>
          </>
        }
      />

      {/* ── Occupancy and today ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <OccupancyPanel
          inside={stats.currentOccupancy}
          capacity={stats.maximumCapacity}
          threshold={Number(configuration.alertThreshold) || 80}
          loading={loading}
        />
        <div className="grid grid-cols-2 gap-4">
          <Tile label="Entries today" value={stats.todayEntries} loading={loading} sub="Recorded at the gates" />
          <Tile label="Exits today" value={stats.todayExits} loading={loading} sub="Visits completed" />
          <Tile
            label="Open alerts"
            value={stats.activeAlerts}
            loading={loading}
            to="/alerts"
            tone={stats.activeAlerts ? "text-red-300" : "text-zinc-100"}
            sub={stats.activeAlerts ? "Needs attention →" : "All clear"}
          />
          <Tile label="Registered" value={stats.registeredVehicles} loading={loading} sub={`${stats.vehiclesOutside} outside now`} />
        </div>
      </div>

      {/* ── Live activity and who is inside ── */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="glass-card">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Live activity</SectionTitle>
            <Link to="/history" className={cardLink}>
              Full history <ArrowRight size={12} />
            </Link>
          </div>
          <LiveFeed events={events} loading={loading} />
        </section>

        <section className="glass-card">
          <div className="mb-3 flex items-center justify-between">
            <SectionTitle>Inside now · {inside.length}</SectionTitle>
            <Link to="/monitoring" className={cardLink}>
              Monitoring <ArrowRight size={12} />
            </Link>
          </div>
          {loading ? (
            <div className="grid gap-3 py-1">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : inside.length ? (
            <ul className="divide-y divide-white/[0.06]">
              {inside.slice(0, 7).map((v) => (
                <li key={v.id}>
                  <Link
                    to={`/vehicles/${v.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 transition hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-semibold tracking-wider text-zinc-100">{v.regNo}</p>
                      <p className="truncate text-xs text-zinc-500">{[v.owner, v.gate].filter(Boolean).join(" · ")}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-400">{formatMinutes(v.since)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Car} title="The facility is empty">
              Vehicles appear here from the moment their entry is recorded.
            </EmptyState>
          )}
          {inside.length > 7 && (
            <Link to="/monitoring" className={`${cardLink} mt-3`}>
              {inside.length - 7} more inside <ArrowRight size={12} />
            </Link>
          )}
        </section>
      </div>

      {/* ── Trends ── */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="glass-card">
          <div className="flex items-baseline justify-between">
            <SectionTitle>Vehicle flow · last 7 days</SectionTitle>
            <div className="flex gap-4 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: chart.entries }} /> Entries
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: chart.exits }} /> Exits
              </span>
            </div>
          </div>
          <div className="mt-5 h-52">
            {chartData.some((d) => d.entries || d.exits) ? (
              <ResponsiveContainer>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: chart.tick, fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.cursor }} />
                  <Bar dataKey="entries" fill={chart.entries} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" fill={chart.exits} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="No movements this week" className="h-full">
                Record an entry or exit to start the chart.
              </EmptyState>
            )}
          </div>
        </section>

        <section className="glass-card">
          <SectionTitle>Activity by gate · all time</SectionTitle>
          {gates.length ? (
            <>
              <div className="mt-5 grid grid-cols-[72px_repeat(6,minmax(24px,1fr))] gap-1.5 font-mono text-[10px] text-zinc-500">
                <span />
                {hours.map((h) => (
                  <span key={h} className="text-center">{h}</span>
                ))}
                {gates.map((gate) => (
                  <div key={gate} className="contents">
                    <span className="self-center truncate pr-1 font-sans text-xs text-zinc-400">{gate}</span>
                    {hours.map((hour) => {
                      const count = heatCount(gate, hour);
                      return (
                        <span
                          key={`${gate}-${hour}`}
                          title={`${gate} ${hour}:00–${String(Number(hour) + 4).padStart(2, "0")}:00 — ${count} movements`}
                          className="h-7 rounded-md"
                          style={{ backgroundColor: `rgba(139, 92, 246, ${0.08 + (count / maxHeat) * 0.82})` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-1.5 font-mono text-[10px] text-zinc-500">
                <span className="mr-1">less</span>
                {[0.08, 0.3, 0.55, 0.9].map((a) => (
                  <span key={a} className="h-2.5 w-5 rounded-sm" style={{ backgroundColor: `rgba(139,92,246,${a})` }} />
                ))}
                <span className="ml-1">more</span>
              </div>
            </>
          ) : (
            <EmptyState title="No gates configured" className="mt-5">
              Add a gate in Settings to see when each one is busiest.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
