import { useMemo, useState } from "react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { searchVehicles } from "../services/vehicleService";

export default function VehicleSearch() {
  const { vehicles, movements } = useApp();
  const [filters, setFilters] = useState({
    regNo: "",
    owner: "",
    currentStatus: "",
    registrationStatus: "",
  });
  const [selectedId, setSelectedId] = useState(null);
  const results = useMemo(() => searchVehicles(vehicles, filters), [vehicles, filters]);
  // The clicked result, or the only result when the search narrows to one vehicle.
  const selected =
    results.find((v) => v.id === selectedId) ?? (results.length === 1 ? results[0] : null);
  const history = selected
    ? movements.filter((m) => m.regNo === selected.regNo)
    : [];

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Vehicle Search</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Search and inspect registered vehicles
        </p>
      </div>

      {/* Filter card */}
      <div className="glass-card">
        <h2 className="mb-4 font-bold text-zinc-100">Search filters</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Registration Number"
            value={filters.regNo}
            placeholder="e.g. MH12AB"
            onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
          />
          <Input
            label="Owner Name"
            value={filters.owner}
            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
          />
          <Select
            label="Current Status"
            value={filters.currentStatus}
            onChange={(e) => setFilters({ ...filters, currentStatus: e.target.value })}
          >
            <option value="">All</option>
            <option>INSIDE</option>
            <option>OUTSIDE</option>
          </Select>
          <Select
            label="Registration Status"
            value={filters.registrationStatus}
            onChange={(e) =>
              setFilters({ ...filters, registrationStatus: e.target.value })
            }
          >
            <option value="">All</option>
            <option>ACTIVE</option>
            <option>INACTIVE</option>
          </Select>
        </div>
      </div>

      {/* Results table */}
      <Table
        columns={[
          { key: "regNo", label: "Reg. No." },
          { key: "owner", label: "Owner" },
          { key: "contact", label: "Contact" },
          { key: "type", label: "Type" },
          {
            key: "registrationStatus",
            label: "Registration",
            render: (row) => <Badge>{row.registrationStatus}</Badge>,
          },
          {
            key: "currentStatus",
            label: "Current",
            render: (row) => <Badge>{row.currentStatus}</Badge>,
          },
          {
            key: "select",
            label: "",
            render: (row) => (
              <Button
                variant={selected?.id === row.id ? "violet" : "ghost"}
                onClick={() => setSelectedId(row.id)}
              >
                History
              </Button>
            ),
          },
        ]}
        rows={results}
        empty="No vehicles match the search criteria."
      />

      {!selected && results.length > 1 && (
        <p className="text-sm text-zinc-600">Select a vehicle to see its movement history.</p>
      )}

      {/* Vehicle detail card */}
      {selected && (
        <div className="glass-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-zinc-100">{selected.regNo}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {selected.owner} · {selected.contact} ·{" "}
                {[selected.color, selected.model].filter(Boolean).join(" ")}
              </p>
              <div className="mt-3 flex gap-2">
                <Badge>{selected.registrationStatus}</Badge>
                <Badge>{selected.currentStatus}</Badge>
              </div>
            </div>
          </div>
          <h3 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Movement history
          </h3>
          <Table
            columns={[
              {
                key: "type",
                label: "Type",
                render: (row) => <Badge>{row.type}</Badge>,
              },
              { key: "gate", label: "Gate" },
              { key: "entryTime", label: "Entry Time" },
              { key: "exitTime", label: "Exit Time" },
              { key: "stayDuration", label: "Duration" },
            ]}
            rows={history}
            empty="No movement history for this vehicle."
          />
        </div>
      )}
    </div>
  );
}
