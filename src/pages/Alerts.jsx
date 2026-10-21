import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";

const ALERT_LABELS = {
  UNAUTHORIZED_VEHICLE: "Unauthorized vehicle",
  INACTIVE_VEHICLE: "Inactive registration",
  DUPLICATE_ENTRY: "Duplicate entry",
  INVALID_EXIT: "Invalid exit",
  CAPACITY_WARNING: "Capacity warning",
  CAPACITY_FULL: "Capacity full",
};

export default function Alerts() {
  const { alerts, resolveAlert } = useApp();
  const [filters, setFilters] = useState({ status: "OPEN", severity: "" });
  const [busyId, setBusyId] = useState(null);
  const open = alerts.filter((a) => a.status === "OPEN").length;
  const resolved = alerts.filter((a) => a.status === "RESOLVED").length;

  const rows = alerts.filter(
    (a) =>
      (!filters.status || a.status === filters.status) &&
      (!filters.severity || a.severity === filters.severity)
  );

  const resolve = async (id) => {
    setBusyId(id);
    await resolveAlert(id);
    setBusyId(null);
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">Alerts</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Live monitoring & alert records
          </p>
        </div>
        <div className="flex gap-3">
          <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300">
            <AlertTriangle size={14} />
            {open} open
          </div>
          <div className="flex items-center gap-2 rounded-full border border-lime-400/20 bg-lime-400/10 px-4 py-2 text-sm font-semibold text-lime-300">
            <CheckCircle2 size={14} />
            {resolved} resolved
          </div>
        </div>
      </div>

      <div className="glass-card grid gap-4 sm:grid-cols-2 md:max-w-xl">
        <Select
          label="Status"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="">All</option>
        </Select>
        <Select
          label="Severity"
          value={filters.severity}
          onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
        >
          <option value="">All</option>
          <option>HIGH</option>
          <option>MEDIUM</option>
          <option>LOW</option>
        </Select>
      </div>

      <Table
        columns={[
          { key: "vehicle", label: "Vehicle" },
          { key: "type", label: "Alert Type", render: (row) => ALERT_LABELS[row.type] ?? row.type },
          {
            key: "severity",
            label: "Severity",
            render: (row) => <Badge>{row.severity}</Badge>,
          },
          { key: "time", label: "Time" },
          { key: "description", label: "Description" },
          {
            key: "status",
            label: "Status",
            render: (row) => (
              <div className="grid gap-1">
                <Badge>{row.status}</Badge>
                {row.resolvedBy && (
                  <span className="text-[11px] text-zinc-600">
                    by {row.resolvedBy} · {row.resolvedAt}
                  </span>
                )}
              </div>
            ),
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) =>
              row.status === "OPEN" ? (
                <Button variant="violet" disabled={busyId === row.id} onClick={() => resolve(row.id)}>
                  Mark as Resolved
                </Button>
              ) : null,
          },
        ]}
        rows={rows}
        empty={filters.status === "OPEN" ? "No open alerts. All clear." : "No alerts match these filters."}
      />
    </div>
  );
}
