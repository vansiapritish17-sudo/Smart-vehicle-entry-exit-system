import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Badge from "../components/common/Badge";
import { Input, Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { chartColors, useTheme } from "../state/theme";
import {
  averageStayMinutes,
  chartDataFromMovements,
  eventTime,
  formatMinutes,
  peakOccupancy,
} from "../services/dashboardService";

const ChartTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs shadow-xl">
        <p className="mb-1 font-semibold text-zinc-300">{label}</p>
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.stroke || p.fill }}>
            {p.dataKey}: <span className="font-bold">{p.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function History() {
  const { movements, configuration, currentUser } = useApp();
  const chart = chartColors[useTheme().theme];
  const [filters, setFilters] = useState({ date: "", vehicle: "", type: "", gate: "" });

  const rows = useMemo(
    () =>
      movements.filter(
        (m) =>
          (!filters.date || eventTime(m).startsWith(filters.date)) &&
          (!filters.vehicle || m.regNo?.toLowerCase().includes(filters.vehicle.replace(/[\s-]/g, "").toLowerCase())) &&
          (!filters.type || m.type === filters.type) &&
          (!filters.gate || m.gate === filters.gate)
      ),
    [movements, filters]
  );

  // Configured gates plus any that appear in older records but were since renamed or removed.
  const gateOptions = useMemo(
    () => [...new Set([...configuration.gates.map((g) => g.name), ...movements.map((m) => m.gate).filter(Boolean)])],
    [configuration.gates, movements]
  );

  const chartData = chartDataFromMovements(movements);
  const entries = rows.filter((r) => r.type === "ENTRY").length;
  const exits = rows.filter((r) => r.type === "EXIT").length;
  const avgStay = averageStayMinutes(rows);
  const peak = peakOccupancy(movements);

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-zinc-100">
          History {currentUser.role === "Administrator" && "& Analytics"}
        </h1>
        <p className="mt-1 text-sm text-zinc-500">Movement records and trends</p>
      </div>

      {/* Stats strip — admin only */}
      {currentUser.role === "Administrator" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Entries", value: entries, color: "text-violet-300" },
            { label: "Total Exits", value: exits, color: "text-sky-300" },
            { label: "Avg Stay Duration", value: formatMinutes(avgStay), color: "text-lime-300", sub: "Completed visits in view" },
            { label: "Peak Occupancy", value: peak, color: "text-amber-300", sub: `Of ${configuration.maximumCapacity} capacity, all time` },
          ].map(({ label, value, color, sub }) => (
            <div key={label} className="glass-card">
              <p className="text-xs font-medium text-zinc-500">{label}</p>
              <p className={`mt-2 text-3xl font-black tracking-tight ${color}`}>
                {value}
              </p>
              {sub && <p className="mt-1 text-xs text-zinc-600">{sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Charts — admin only */}
      {currentUser.role === "Administrator" && (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="glass-card">
            <h2 className="mb-4 font-bold text-zinc-100">Entries vs Exits</h2>
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={chartData}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                  />
                  <YAxis hide />
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.cursor }} />
                  <Bar dataKey="entries" fill={chart.entries} radius={[6, 6, 0, 0]} />
                  <Bar dataKey="exits" fill={chart.exits} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass-card">
            <h2 className="mb-4 font-bold text-zinc-100">Movement Trend</h2>
            <div className="h-60">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: chart.tick, fontSize: 11 }}
                  />
                  <YAxis hide />
                  <CartesianGrid stroke={chart.grid} vertical={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    dataKey="entries"
                    stroke={chart.entries}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    dataKey="exits"
                    stroke={chart.exits}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="glass-card">
        <h2 className="mb-4 font-bold text-zinc-100">Filter records</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Date"
            type="date"
            value={filters.date}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
          />
          <Input
            label="Vehicle"
            value={filters.vehicle}
            placeholder="e.g. MH12AB"
            onChange={(e) => setFilters({ ...filters, vehicle: e.target.value })}
          />
          <Select
            label="Movement type"
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="">All</option>
            <option>ENTRY</option>
            <option>EXIT</option>
          </Select>
          <Select
            label="Gate"
            value={filters.gate}
            onChange={(e) => setFilters({ ...filters, gate: e.target.value })}
          >
            <option value="">All gates</option>
            {gateOptions.map((gate) => <option key={gate}>{gate}</option>)}
          </Select>
        </div>
      </div>

      <Table
        columns={[
          { key: "regNo", label: "Vehicle No." },
          { key: "owner", label: "Owner" },
          {
            key: "type",
            label: "Movement",
            render: (row) => <Badge>{row.type}</Badge>,
          },
          { key: "gate", label: "Gate" },
          { key: "entryTime", label: "Entry Time" },
          { key: "exitTime", label: "Exit Time" },
          { key: "stayDuration", label: "Duration" },
          { key: "operator", label: "Operator" },
        ]}
        rows={rows}
        empty="No movement records match the current filters."
      />
    </div>
  );
}
