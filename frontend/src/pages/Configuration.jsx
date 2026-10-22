import { useEffect, useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import PageHeader, { SectionTitle } from "../components/common/PageHeader";
import { useApp } from "../state/AppContext";

const GATE_STATUS = {
  ACTIVE: { dot: "bg-lime-400", label: "Accepting entries and exits" },
  MAINTENANCE: { dot: "bg-amber-400", label: "Closed for maintenance" },
  INACTIVE: { dot: "bg-zinc-500", label: "Closed" },
};

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
  const capacity = Number(form.maximumCapacity) || 0;
  const threshold = Number(form.alertThreshold) || 0;
  const alertAt = Math.ceil((capacity * threshold) / 100);
  const insidePercent = capacity ? Math.min(100, (inside / capacity) * 100) : 0;

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
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Facility capacity, when to raise an alert, and which gates are open."
        actions={
          <>
            {dirty && <span className="mr-1 text-xs text-amber-300">Unsaved changes</span>}
            {dirty && (
              <Button type="button" variant="secondary" onClick={discard}>
                Discard
              </Button>
            )}
            <Button type="submit" disabled={saving || !dirty}>
              <Save size={15} /> {saving ? "Saving…" : "Save settings"}
            </Button>
          </>
        }
      />

      <section className="glass-card">
        <SectionTitle className="mb-5">Capacity</SectionTitle>
        <div className="grid gap-6 md:grid-cols-[1fr_1fr_1.3fr]">
          <Input
            label="Maximum capacity"
            type="number"
            min={1}
            max={100000}
            required
            value={form.maximumCapacity}
            onChange={(e) => edit({ maximumCapacity: e.target.value })}
          />
          <Input
            label="Alert threshold (%)"
            type="number"
            min={1}
            max={100}
            required
            value={form.alertThreshold}
            onChange={(e) => edit({ alertThreshold: e.target.value })}
          />
          {/* Live preview of what these numbers mean */}
          <div className="grid content-end gap-2">
            <div className="relative h-2 rounded-full bg-white/[0.07]">
              <div className="h-full rounded-full bg-lime-300" style={{ width: `${insidePercent}%` }} />
              <span className="absolute -top-1 h-4 w-px bg-amber-400" style={{ left: `${Math.min(100, threshold)}%` }} />
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              <span className="text-zinc-200">{inside}</span> inside now. A warning is raised at{" "}
              <span className="text-amber-300">{alertAt}</span> vehicles; entries are refused at{" "}
              <span className="text-zinc-200">{capacity}</span>.
            </p>
          </div>
        </div>
      </section>

      <section className="glass-card">
        <div className="mb-5 flex items-center justify-between">
          <SectionTitle>Gates · {form.gates.length}</SectionTitle>
          <Button type="button" size="sm" variant="secondary" onClick={addGate}>
            <Plus size={14} /> Add gate
          </Button>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {form.gates.map((gate) => {
            const status = GATE_STATUS[gate.status] ?? GATE_STATUS.INACTIVE;
            return (
              <div key={gate.id} className="grid gap-3 rounded-xl border border-white/[0.08] bg-[var(--bg)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remove ${gate.name || "gate"}`}
                    title={form.gates.length <= 1 ? "At least one gate is required" : "Remove gate"}
                    disabled={form.gates.length <= 1}
                    onClick={() => removeGate(gate.id)}
                    className="w-8 px-0 hover:!bg-red-500/10 hover:!text-red-400"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label="Name"
                    value={gate.name}
                    required
                    maxLength={40}
                    onChange={(e) => updateGate(gate.id, { name: e.target.value })}
                  />
                  <Select label="Status" value={gate.status} onChange={(e) => updateGate(gate.id, { status: e.target.value })}>
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="INACTIVE">Inactive</option>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          Only active gates can record entries and exits. At least one gate must stay active.
        </p>
      </section>
    </form>
  );
}
