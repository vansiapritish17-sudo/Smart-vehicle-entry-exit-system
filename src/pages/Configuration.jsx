import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";

export default function Configuration() {
  const { configuration, vehicles, saveConfiguration } = useApp();
  const [form, setForm] = useState(configuration);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  // Follow live updates (including the initial load) until the user starts editing.
  useEffect(() => {
    if (!dirty) setForm(configuration);
  }, [configuration, dirty]);

  const edit = (updates) => {
    setDirty(true);
    setForm((f) => ({ ...f, ...updates }));
  };

  const updateGate = (id, updates) =>
    edit({ gates: form.gates.map((g) => (g.id === id ? { ...g, ...updates } : g)) });

  const addGate = () =>
    edit({ gates: [...form.gates, { id: `G${Date.now()}`, name: "", status: "ACTIVE" }] });

  const removeGate = (id) => edit({ gates: form.gates.filter((g) => g.id !== id) });

  const inside = vehicles.filter((v) => v.currentStatus === "INSIDE").length;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await saveConfiguration({
      maximumCapacity: Number(form.maximumCapacity),
      alertThreshold: Number(form.alertThreshold),
      gates: form.gates.map((g) => ({ ...g, name: g.name.trim() })),
    });
    setSaving(false);
    if (result.ok) setDirty(false);
  };

  const discard = () => {
    setDirty(false);
    setForm(configuration);
  };

  return (
    <form onSubmit={submit} className="grid gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-100">System Configuration</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage capacity, alert thresholds, and gates
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button type="button" variant="secondary" onClick={discard}>Discard</Button>
          )}
          <Button type="submit" variant="violet" disabled={saving || !dirty}>
            <Save size={15} /> Save Configuration
          </Button>
        </div>
      </div>

      {/* General settings */}
      <div className="glass-card">
        <h2 className="mb-5 font-bold text-zinc-100">General settings</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Maximum Capacity"
            type="number"
            min={1}
            max={100000}
            required
            value={form.maximumCapacity}
            onChange={(e) => edit({ maximumCapacity: e.target.value })}
          />
          <Input
            label="Capacity Alert Threshold (%)"
            type="number"
            min={1}
            max={100}
            required
            value={form.alertThreshold}
            onChange={(e) => edit({ alertThreshold: e.target.value })}
          />
          <div className="grid content-end text-xs text-zinc-500">
            <p>Currently inside: <b className="text-zinc-300">{inside}</b></p>
            <p className="mt-1">
              A capacity alert is raised when occupancy reaches{" "}
              <b className="text-zinc-300">
                {Math.ceil((Number(form.maximumCapacity) || 0) * (Number(form.alertThreshold) || 0) / 100)}
              </b>{" "}
              vehicles. Entries are refused at full capacity.
            </p>
          </div>
        </div>
      </div>

      {/* Gate configuration */}
      <div className="glass-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold text-zinc-100">Gate configuration</h2>
          <Button type="button" variant="secondary" onClick={addGate}>
            <Plus size={14} /> Add Gate
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {form.gates.map((gate) => (
            <div
              key={gate.id}
              className="grid gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-4"
            >
              <Input
                label="Gate Name"
                value={gate.name}
                required
                maxLength={40}
                onChange={(e) => updateGate(gate.id, { name: e.target.value })}
              />
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Gate Status"
                    value={gate.status}
                    onChange={(e) => updateGate(gate.id, { status: e.target.value })}
                  >
                    <option>ACTIVE</option>
                    <option>MAINTENANCE</option>
                    <option>INACTIVE</option>
                  </Select>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={`Remove ${gate.name || "gate"}`}
                  disabled={form.gates.length <= 1}
                  onClick={() => removeGate(gate.id)}
                  className="hover:text-red-400"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-zinc-600">
          Only ACTIVE gates can record entries and exits. At least one gate must be active.
        </p>
      </div>

      {/* Saved gates */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Saved gates
        </h2>
        <Table
          columns={[
            { key: "name", label: "Gate Name" },
            {
              key: "status",
              label: "Status",
              render: (row) => <Badge>{row.status}</Badge>,
            },
          ]}
          rows={configuration.gates}
          empty="No gates configured."
        />
      </section>
    </form>
  );
}
