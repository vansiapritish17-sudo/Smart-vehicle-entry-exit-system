import { useState } from "react";
import { Check, ShieldCheck } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Segmented } from "../components/common/Field";
import PageHeader, { EmptyState, Plate } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { ALERT_LABELS } from "../services/dashboardService";

export default function Alerts() {
  const { alerts, resolveAlert, loading } = useApp();
  const [filters, setFilters] = useState({ status: "OPEN", severity: "" });
  const [busyId, setBusyId] = useState(null);
  const open = alerts.filter((a) => a.status === "OPEN").length;
  const resolved = alerts.length - open;

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
      <PageHeader
        eyebrow="Security"
        title="Alerts"
        description="Refused attempts and capacity warnings raised at the gates."
        actions={
          <div className="flex items-center gap-5 font-mono text-xs">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className={`h-1.5 w-1.5 rounded-full ${open ? "bg-amber-400" : "bg-zinc-600"}`} />
              <span className="tabular-nums text-zinc-100">{open}</span> open
            </span>
            <span className="flex items-center gap-2 text-zinc-400">
              <span className="h-1.5 w-1.5 rounded-full bg-lime-400" />
              <span className="tabular-nums text-zinc-100">{resolved}</span> resolved
            </span>
          </div>
        }
      />

      <div className="flex flex-wrap gap-6">
        <Segmented
          label="Status"
          value={filters.status}
          onChange={(status) => setFilters({ ...filters, status })}
          options={[["OPEN", "Open"], ["RESOLVED", "Resolved"], ["", "All"]]}
        />
        <Segmented
          label="Severity"
          value={filters.severity}
          onChange={(severity) => setFilters({ ...filters, severity })}
          options={[["", "All"], ["HIGH", "High"], ["MEDIUM", "Medium"], ["LOW", "Low"]]}
        />
      </div>

      <Table
        loading={loading}
        columns={[
          { key: "vehicle", label: "Vehicle", render: (row) => <Plate>{row.vehicle || "—"}</Plate> },
          {
            key: "type",
            label: "Alert",
            render: (row) => <span className="text-zinc-200">{ALERT_LABELS[row.type] ?? row.type}</span>,
          },
          { key: "severity", label: "Severity", render: (row) => <Badge>{row.severity}</Badge> },
          { key: "time", label: "Time", render: (row) => <span className="font-mono text-xs text-zinc-400">{row.time}</span> },
          {
            key: "description",
            label: "Details",
            render: (row) => <span className="block max-w-sm text-zinc-400">{row.description}</span>,
          },
          {
            key: "status",
            label: "Status",
            render: (row) =>
              row.status === "OPEN" ? (
                <Button size="sm" variant="secondary" disabled={busyId === row.id} onClick={() => resolve(row.id)}>
                  <Check size={13} /> Resolve
                </Button>
              ) : (
                <div className="grid gap-0.5">
                  <Badge>{row.status}</Badge>
                  {row.resolvedBy && (
                    <span className="text-[11px] text-zinc-500">
                      by {row.resolvedBy} · {row.resolvedAt}
                    </span>
                  )}
                </div>
              ),
          },
        ]}
        rows={rows}
        empty={
          filters.status === "OPEN" && !filters.severity ? (
            <EmptyState icon={ShieldCheck} title="All clear">
              No open alerts. Refused attempts at any gate will appear here instantly.
            </EmptyState>
          ) : (
            "No alerts match these filters."
          )
        }
      />
    </div>
  );
}
