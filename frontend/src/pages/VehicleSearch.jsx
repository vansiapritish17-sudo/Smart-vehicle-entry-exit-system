import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, SearchX } from "lucide-react";
import Badge from "../components/common/Badge";
import { Input, Select } from "../components/common/Field";
import PageHeader, { EmptyState, SectionTitle } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { searchVehicles } from "../services/vehicleService";

const emptyFilters = { regNo: "", owner: "", currentStatus: "", registrationStatus: "" };

export default function VehicleSearch() {
  const { vehicles, loading } = useApp();
  const [filters, setFilters] = useState(emptyFilters);
  const results = useMemo(() => searchVehicles(vehicles, filters), [vehicles, filters]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Register"
        title="Vehicle search"
        description="Find a registered vehicle and open its visit history."
      />

      <section className="grid gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle>
            Results · {results.length}
            {filtered && ` of ${vehicles.length}`}
          </SectionTitle>
          {filtered && (
            <button
              type="button"
              onClick={() => setFilters(emptyFilters)}
              className="text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
            >
              Clear filters
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Input
            label="Registration number"
            value={filters.regNo}
            placeholder="e.g. MH12AB"
            autoFocus
            onChange={(e) => setFilters({ ...filters, regNo: e.target.value })}
          />
          <Input
            label="Owner"
            value={filters.owner}
            onChange={(e) => setFilters({ ...filters, owner: e.target.value })}
          />
          <Select
            label="Location"
            value={filters.currentStatus}
            onChange={(e) => setFilters({ ...filters, currentStatus: e.target.value })}
          >
            <option value="">Inside or outside</option>
            <option value="INSIDE">Inside</option>
            <option value="OUTSIDE">Outside</option>
          </Select>
          <Select
            label="Registration"
            value={filters.registrationStatus}
            onChange={(e) => setFilters({ ...filters, registrationStatus: e.target.value })}
          >
            <option value="">Active or inactive</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </Select>
        </div>

        <Table
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
            { key: "contact", label: "Contact" },
            { key: "type", label: "Type" },
            { key: "registrationStatus", label: "Registration", render: (row) => <Badge>{row.registrationStatus}</Badge> },
            { key: "currentStatus", label: "Location", render: (row) => <Badge>{row.currentStatus}</Badge> },
            {
              key: "open",
              label: "",
              render: (row) => (
                <Link
                  to={`/vehicles/${row.id}`}
                  className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-zinc-400 transition hover:text-zinc-100"
                >
                  Visits <ArrowRight size={12} />
                </Link>
              ),
            },
          ]}
          rows={results}
          empty={
            <EmptyState icon={SearchX} title={filtered ? "No matching vehicles" : "No vehicles registered"}>
              {filtered ? "Try part of the plate, or clear a filter." : "Registered vehicles will be listed here."}
            </EmptyState>
          }
        />
      </section>
    </div>
  );
}
