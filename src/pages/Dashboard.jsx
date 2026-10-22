import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Car,
  DoorClosed,
  DoorOpen,
  ParkingCircle,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "../state/AppContext";
import { chartColors, useTheme } from "../state/theme";
import {
  chartDataFromMovements,
  eventTime,
  getDashboardStats,
} from "../services/dashboardService";

/* ── Sub-components ── */

function Pill({ children, tone = "violet" }) {
  const tones = {
    violet: "bg-violet-500/15 text-violet-300 ring-violet-500/25",
    lime: "bg-lime-400/15 text-lime-300 ring-lime-400/25",
    red: "bg-red-500/15 text-red-300 ring-red-500/25",
    sky: "bg-sky-500/15 text-sky-300 ring-sky-500/25",
    zinc: "bg-white/8 text-zinc-400 ring-white/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub, icon: Icon, iconBg, iconColor }) {
  return (
    <div className="glass-card flex items-start justify-between gap-4 animate-fade-up">
      <div>
        <p className="text-xs font-medium text-zinc-500">{label}</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-zinc-100">{value}</p>
        {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
      </div>
      <div className={`shrink-0 rounded-full p-3 ${iconBg}`}>
        <Icon className={iconColor} size={20} />
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-semibold text-zinc-300">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.fill }}>
            {p.dataKey}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/* ── Main Component ── */

export default function Dashboard() {
  const { vehicles, movements, alerts, configuration, currentUser } = useApp();
  const chart = chartColors[useTheme().theme];
  const stats = getDashboardStats(vehicles, movements, alerts, configuration);
  const chartData = chartDataFromMovements(movements);
  const occupancyPercent = stats.maximumCapacity
    ? Math.min(100, Math.round((stats.currentOccupancy / stats.maximumCapacity) * 100))
    : 0;
  const openAlerts = alerts.filter((a) => a.status === "OPEN");
  const insideVehicles = vehicles.filter((v) => v.currentStatus === "INSIDE").slice(0, 6);
  const recentActivity = movements.slice(0, 6);
  const gates = configuration.gates.map((g) => g.name);
  // Six 4-hour windows across the day; each cell counts movements in that window.
  const hours = ["00", "04", "08", "12", "16", "20"];
  const heatCount = (gate, hour) =>
    movements.filter((m) => {
      const h = Number(eventTime(m).slice(11, 13));
      return m.gate === gate && h >= Number(hour) && h < Number(hour) + 4;
    }).length;
  const heatValues = gates.flatMap((gate) => hours.map((hour) => heatCount(gate, hour)));
  const maxHeat = Math.max(1, ...heatValues);
  const isHighOccupancy = occupancyPercent >= configuration.alertThreshold;

  return (
    <div className="grid gap-6">
      {/* ── Hero ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-3xl font-black tracking-tight text-zinc-100 sm:text-4xl">
            Welcome back,{" "}
            <span className="text-violet-400">{currentUser.name}</span>
          </p>
          <p className="mt-1.5 text-sm text-zinc-500">
            Barbican · live gate activity
          </p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/movements/entry"
            id="btn-record-entry"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold text-zinc-950 hover:bg-zinc-200 active:scale-95 transition"
          >
            <DoorOpen size={15} /> Record Entry
          </Link>
          <Link
            to="/movements/exit"
            id="btn-record-exit"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-bold text-zinc-300 hover:bg-white/8 active:scale-95 transition"
          >
            <DoorClosed size={15} /> Record Exit
          </Link>
          <Link
            to="/vehicles/search"
            id="btn-search"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/12 text-zinc-400 hover:bg-white/8 hover:text-zinc-200 transition"
            aria-label="Search vehicles"
          >
            <Search size={16} />
          </Link>
        </div>
      </div>

      {/* ── Current Occupancy Banner ── */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-zinc-500">Current occupancy</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <p className="text-5xl font-black tracking-tight text-zinc-100">
              {stats.currentOccupancy}
              <span className="text-zinc-600">/{stats.maximumCapacity}</span>
            </p>
            <Pill tone={isHighOccupancy ? "red" : "lime"}>
              {occupancyPercent}% occupied
            </Pill>
          </div>
          {/* Capacity bar */}
          <div className="mt-4 h-1.5 w-64 max-w-full overflow-hidden rounded-full bg-white/8">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                isHighOccupancy ? "bg-red-500" : "bg-violet-500"
              }`}
              style={{ width: `${occupancyPercent}%` }}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {[
            { label: "Inside", value: stats.vehiclesInside, tone: "text-violet-300" },
            { label: "Outside", value: stats.vehiclesOutside, tone: "text-zinc-400" },
            { label: "Open alerts", value: openAlerts.length, tone: "text-red-400" },
          ].map(({ label, value, tone }) => (
            <div key={label} className="text-center">
              <p className={`text-2xl font-black ${tone}`}>{value}</p>
              <p className="text-xs text-zinc-600">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Metrics strip ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Registered Vehicles"
          value={stats.registeredVehicles}
          sub="Total fleet"
          icon={Car}
          iconBg="bg-violet-500/15"
          iconColor="text-violet-300"
        />
        <MetricCard
          label="Vehicles Inside"
          value={stats.vehiclesInside}
          sub={`${stats.vehiclesOutside} outside`}
          icon={ParkingCircle}
          iconBg="bg-lime-400/15"
          iconColor="text-lime-300"
        />
        <MetricCard
          label="Today's Entries"
          value={stats.todayEntries}
          sub={`${stats.todayExits} exits today`}
          icon={ArrowUpRight}
          iconBg="bg-sky-500/15"
          iconColor="text-sky-300"
        />
        <MetricCard
          label="Active Alerts"
          value={stats.activeAlerts}
          sub="Open alert records"
          icon={AlertTriangle}
          iconBg="bg-red-500/15"
          iconColor="text-red-300"
        />
      </div>

      {/* ── Charts row ── */}
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        {/* Vehicle flow bar chart */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Vehicle Flow
              </p>
              <p className="mt-0.5 text-sm text-zinc-300">
                Entries vs exits from your movement records
              </p>
            </div>
            <Pill tone="zinc">Last 7 days</Pill>
          </div>
          <div className="mt-5 h-52">
            {chartData.some((d) => d.entries || d.exits) ? (
              <ResponsiveContainer>
                <BarChart data={chartData} barCategoryGap="30%">
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: chart.cursor }}
                  />
                  <Bar dataKey="entries" fill={chart.entries} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="exits" fill={chart.exits} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center rounded-xl border border-dashed border-white/8 text-sm text-zinc-600">
                Record an entry or exit to build the chart
              </div>
            )}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-violet-500" /> Entries
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-lime-400" /> Exits
            </span>
          </div>
        </div>

        {/* Activity heatmap */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-100">Activity by gate</h2>
            <Pill tone="zinc">All time</Pill>
          </div>
          {gates.length ? (
            <>
              <div className="mt-5 grid grid-cols-[64px_repeat(6,minmax(24px,1fr))] gap-1.5 text-[10px] text-zinc-600">
                <span />
                {hours.map((h) => (
                  <span key={h} className="text-center">{h}</span>
                ))}
                {gates.map((gate) => (
                  <div key={gate} className="contents">
                    <span className="self-center truncate pr-1">{gate}</span>
                    {hours.map((hour) => {
                      const count = heatCount(gate, hour);
                      const alpha = 0.12 + (count / maxHeat) * 0.78;
                      return (
                        <span
                          key={`${gate}-${hour}`}
                          title={`${gate} ${hour}:00–${String(Number(hour) + 4).padStart(2, "0")}:00 — ${count} movements`}
                          className="h-7 rounded-md transition-opacity hover:opacity-80"
                          style={{
                            backgroundColor: `rgba(139, 92, 246, ${alpha})`,
                          }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-zinc-600">
                <span>Less</span>
                {[0.12, 0.35, 0.6, 0.9].map((a, i) => (
                  <span
                    key={i}
                    className="h-2.5 w-5 rounded"
                    style={{ backgroundColor: `rgba(139,92,246,${a})` }}
                  />
                ))}
                <span>More</span>
              </div>
            </>
          ) : (
            <div className="mt-5 grid min-h-40 place-items-center rounded-xl border border-dashed border-white/8 text-sm text-zinc-600">
              Configure gates to see the heatmap
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Vehicles inside */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-100">Vehicles inside</h2>
            <Link to="/monitoring" className="text-xs font-bold text-violet-400 hover:text-violet-300 transition">
              {stats.vehiclesInside > insideVehicles.length
                ? `View all ${stats.vehiclesInside} →`
                : "Live monitoring →"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {insideVehicles.length ? (
              insideVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.06] transition"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-zinc-100">
                      {vehicle.regNo}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{vehicle.owner}</p>
                  </div>
                  <Pill tone="lime">Inside</Pill>
                </div>
              ))
            ) : (
              <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/8 text-center text-sm text-zinc-600">
                No vehicles currently inside
              </div>
            )}
          </div>
        </div>

        {/* Recent activity — matches "Recent transactions" in reference */}
        <div className="glass-card">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-100">Recent activity</h2>
            <Link
              to="/history"
              className="text-xs font-bold text-violet-400 hover:text-violet-300 transition"
            >
              View history →
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {recentActivity.length ? (
              recentActivity.map((movement) => {
                const isEntry = movement.type === "ENTRY";
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3 hover:bg-white/[0.06] transition"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                          isEntry ? "bg-violet-500/15" : "bg-sky-500/15"
                        }`}
                      >
                        {isEntry ? (
                          <ArrowUpRight
                            size={14}
                            className="text-violet-300"
                          />
                        ) : (
                          <ArrowDownRight
                            size={14}
                            className="text-sky-300"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-zinc-100">
                          {movement.regNo}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {movement.owner} · {movement.gate}
                        </p>
                      </div>
                    </div>
                    <Pill tone={isEntry ? "violet" : "sky"}>
                      {movement.type}
                    </Pill>
                  </div>
                );
              })
            ) : (
              <div className="grid min-h-40 place-items-center rounded-xl border border-dashed border-white/8 text-center text-sm text-zinc-600">
                Movement records will appear here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ShieldCheck footer watermark ── */}
      <div className="flex items-center gap-2 text-xs text-zinc-700 mt-2">
        <ShieldCheck size={13} />
        <span>Barbican · Vehicle Access Intelligence</span>
      </div>
    </div>
  );
}
