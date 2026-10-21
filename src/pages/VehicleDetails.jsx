import { useNavigate, useParams } from "react-router-dom";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { averageStayMinutes, formatMinutes } from "../services/dashboardService";

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, movements, loading } = useApp();
  const vehicle = vehicles.find((v) => v.id === id);
  // Back to wherever the user came from; operators cannot open /vehicles.
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/vehicles/search"));

  if (!vehicle) {
    return (
      <div className="glass-card max-w-md">
        <p className="text-zinc-400">{loading ? "Loading vehicle…" : "Vehicle not found."}</p>
        <Button className="mt-4" variant="secondary" onClick={back}>← Back</Button>
      </div>
    );
  }

  const rows = movements.filter((m) => m.regNo === vehicle.regNo);
  const visits = rows.filter((m) => m.type === "ENTRY").length;

  return (
    <div className="grid gap-6">
      {/* Vehicle header */}
      <div className="glass-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-100">{vehicle.regNo}</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              {[vehicle.owner, vehicle.contact, vehicle.type, [vehicle.color, vehicle.model].filter(Boolean).join(" ")]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <div className="mt-3 flex gap-2">
              <Badge>{vehicle.registrationStatus}</Badge>
              <Badge>{vehicle.currentStatus}</Badge>
            </div>
          </div>
          <div className="flex items-start gap-6">
            <div className="text-right">
              <p className="text-2xl font-black text-zinc-100">{visits}</p>
              <p className="text-xs text-zinc-600">Visits</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-zinc-100">{formatMinutes(averageStayMinutes(rows))}</p>
              <p className="text-xs text-zinc-600">Avg stay</p>
            </div>
            <Button variant="secondary" onClick={back}>← Back</Button>
          </div>
        </div>
      </div>

      {/* Movement history */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Movement History
        </h2>
        <Table
          columns={[
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
          empty="No movement history for this vehicle."
        />
      </section>
    </div>
  );
}
