import { useMemo, useState } from "react";
import { Download, History as HistoryIcon } from "lucide-react";
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
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import PageHeader, { EmptyState, Plate, SectionTitle } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { chartColors, useTheme } from "../state/theme";
import { downloadCsv } from "../services/exportCsv";
import {
  averageStayMinutes,
  chartDataFromMovements,
  eventTime,
  formatMinutes,
  localToday,
  peakOccupancy,
} from "../services/dashboardService";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-xs shadow-[var(--popover-shadow)]">
      <p className="mb-1 font-mono text-zinc-400">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-zinc-200">
          <span className="h-2 w-2 rounded-full" style={{ background: p.stroke || p.fill }} />
          {p.dataKey === "entries" ? "Entries" : "Exits"}
          <span className="ml-auto font-mono font-semibold">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const CSV_COLUMNS = [
  { label: "Vehicle", value: (m) => m.regNo },
  { label: "Owner", value: (m) => m.owner },
  { label: "Movement", value: (m) => m.type },
  { label: "Gate", value: (m) => m.gate },
  { label: "Entry time", value: (m) => m.entryTime },
  { label: "Exit time", value: (m) => m.exitTime },
  { label: "Duration", value: (m) => m.stayDuration },
  { label: "Operator", value: (m) => m.operator },
];

export default function History() {
  const { movements, configuration, currentUser, loading } = useApp();
  const chart = chartColors[useTheme().theme];
  const isAdmin = currentUser.role === "Administrator";
  const [filters, setFilters] = useState({ date: "", vehicle: "", type: "", gate: "" });
  const filtered = Object.values(filters).some(Boolean);

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

  const exportRows = () => downloadCsv(`barbican-movements-${localToday()}.csv`, CSV_COLUMNS, rows);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Records"
        title={isAdmin ? "History & analytics" : "History"}
        description="Every recorded entry and exit, with the trends behind them."
        actions={
          <Button variant="secondary" onClick={exportRows} disabled={!rows.length}>
            <Download size={14} /> Export CSV
          </Button>
        }
      />

      {isAdmin && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Entries", value: entries, sub: filtered ? "In the current view" : "All time" },
              { label: "Exits", value: exits, sub: filtered ? "In the current view" : "All time" },
              { label: "Average stay", value: formatMinutes(avgStay), sub: "Completed visits in view" },
              { label: "Peak occupancy", value: peak, sub: `Of ${configuration.maximumCapacity} spaces, all time` },
            ].map(({ label, value, sub }) => (
              <div key={label} className="glass-card">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-100 tabular-nums">{value}</p>
                <p className="mt-1 text-xs text-zinc-500">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="glass-card">
              <SectionTitle>Entries vs exits · last 7 days</SectionTitle>
              <div className="mt-4 h-60">
                <ResponsiveContainer>
                  <BarChart data={chartData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: chart.tick, fontSize: 11 }} />
                    <YAxis hide />
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: chart.cursor }} />
                    <Bar dataKey="entries" fill={chart.entries} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="exits" fill={chart.exits} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section className="glass-card">
              <SectionTitle>Movement trend · last 7 days</SectionTitle>
              <div className="mt-4 h-60">
                <ResponsiveContainer>
                  <LineChart data={chartData}>
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: chart.tick, fontSize: 11 }} />
                    <YAxis hide />
                    <CartesianGrid stroke={chart.grid} vertical={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line dataKey="entries" stroke={chart.entries} strokeWidth={2} dot={false} />
                    <Line dataKey="exits" stroke={chart.exits} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle>
            Records · {rows.length}
            {filtered && ` of ${movements.length}`}
          </SectionTitle>
          {filtered && (
            <button
              type="button"
              onClick={() => setFilters({ date: "", vehicle: "", type: "", gate: "" })}
              className="text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
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
          <Select label="Movement" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="">Entries and exits</option>
            <option value="ENTRY">Entries</option>
            <option value="EXIT">Exits</option>
          </Select>
          <Select label="Gate" value={filters.gate} onChange={(e) => setFilters({ ...filters, gate: e.target.value })}>
            <option value="">All gates</option>
            {gateOptions.map((gate) => (
              <option key={gate}>{gate}</option>
            ))}
          </Select>
        </div>

        <Table
          loading={loading}
          columns={[
            { key: "regNo", label: "Vehicle", render: (row) => <Plate>{row.regNo}</Plate> },
            { key: "owner", label: "Owner" },
            { key: "type", label: "Movement", render: (row) => <Badge>{row.type}</Badge> },
            { key: "gate", label: "Gate" },
            { key: "entryTime", label: "Entry", render: (row) => <span className="font-mono text-xs">{row.entryTime || "—"}</span> },
            { key: "exitTime", label: "Exit", render: (row) => <span className="font-mono text-xs">{row.exitTime || "—"}</span> },
            { key: "stayDuration", label: "Duration" },
            { key: "operator", label: "Operator" },
          ]}
          rows={rows}
          empty={
            filtered ? (
              "No records match these filters."
            ) : (
              <EmptyState icon={HistoryIcon} title="No movements yet">
                Every entry and exit recorded at a gate is kept here.
              </EmptyState>
            )
          }
        />
      </section>
    </div>
  );
}
