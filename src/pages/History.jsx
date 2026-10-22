import { useMemo, useState } from "react";
import { Download, History as HistoryIcon, Trash2 } from "lucide-react";
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
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Input, Segmented, Select } from "../components/common/Field";
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

const CLEAR_RANGES = [
  [30, "30+ days"],
  [90, "90+ days"],
  [0, "Everything"],
];

/** Records a clear would remove — the same rule the server applies. */
function clearable(movements, olderThanDays) {
  let cutoff = null;
  if (olderThanDays > 0) {
    const d = new Date();
    d.setDate(d.getDate() - olderThanDays);
    const pad = (n) => String(n).padStart(2, "0");
    cutoff = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00`;
  }
  return movements.filter((m) => {
    const openEntry = m.type === "ENTRY" && !m.exitTime;
    return !openEntry && (!cutoff || eventTime(m) < cutoff);
  });
}

export default function History() {
  const { movements, configuration, currentUser, loading, clearHistory } = useApp();
  const [clearOpen, setClearOpen] = useState(false);
  const [clearAge, setClearAge] = useState(30);
  const [clearing, setClearing] = useState(false);
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

  const toClear = clearable(movements, clearAge);
  const openVisits = movements.filter((m) => m.type === "ENTRY" && !m.exitTime).length;
  const confirmClear = async () => {
    setClearing(true);
    const result = await clearHistory(clearAge);
    setClearing(false);
    if (result.ok) setClearOpen(false);
  };

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Records"
        title={isAdmin ? "History & analytics" : "History"}
        description="Every recorded entry and exit, with the trends behind them."
        actions={
          <>
            <Button variant="secondary" onClick={exportRows} disabled={!rows.length}>
              <Download size={14} /> Export CSV
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                onClick={() => setClearOpen(true)}
                disabled={!movements.length}
                className="hover:!bg-red-500/10 hover:!text-red-300"
              >
                <Trash2 size={14} /> Clear history
              </Button>
            )}
          </>
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

      <ConfirmDialog
        open={clearOpen}
        title="Clear movement history?"
        confirmLabel={toClear.length ? `Delete ${toClear.length} record${toClear.length === 1 ? "" : "s"}` : "Nothing to delete"}
        busyLabel="Clearing…"
        busy={clearing}
        confirmDisabled={!toClear.length}
        onConfirm={confirmClear}
        onCancel={() => setClearOpen(false)}
      >
        <div className="grid gap-4">
          <Segmented label="Delete records" value={clearAge} onChange={setClearAge} options={CLEAR_RANGES} fill />
          {toClear.length ? (
            <p>
              <span className="font-medium text-zinc-100">{toClear.length}</span> of {movements.length} records will be
              permanently deleted. This can't be undone.
            </p>
          ) : (
            <p>
              No records are {clearAge ? `older than ${clearAge} days` : "complete yet"} — nothing would be deleted.
            </p>
          )}
          {openVisits > 0 && (
            <p className="text-zinc-500">
              The open entry of the {openVisits} vehicle{openVisits === 1 ? "" : "s"} inside now is kept, so their exits
              still record the stay.
            </p>
          )}
          <button
            type="button"
            onClick={() => downloadCsv(`barbican-movements-${localToday()}.csv`, CSV_COLUMNS, movements)}
            className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-zinc-300 underline decoration-white/20 underline-offset-2 hover:decoration-zinc-300"
          >
            <Download size={12} /> Export all records first
          </button>
        </div>
      </ConfirmDialog>
    </div>
  );
}
