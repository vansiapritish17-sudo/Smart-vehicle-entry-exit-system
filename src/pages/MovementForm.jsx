import { useEffect, useRef, useState } from "react";
import { CheckCircle2, DoorClosed, DoorOpen, ListFilter, Search, XCircle } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import { useApp } from "../state/AppContext";

const entrySteps = [
  "Receive vehicle number",
  "Search vehicle records",
  "Verify registration status",
  "Check current status",
  "Validate entry eligibility",
  "Create movement record",
  "Update vehicle status",
  "Update occupancy count",
  "Generate entry confirmation",
];
const exitSteps = [
  "Receive vehicle number",
  "Retrieve vehicle record",
  "Check current status",
  "Validate exit eligibility",
  "Create exit movement",
  "Update vehicle status",
  "Calculate stay duration",
  "Update occupancy count",
  "Generate exit confirmation",
];

export default function MovementForm({ mode }) {
  const { configuration, vehicles, submitEntry, submitExit } = useApp();
  const [form, setForm] = useState({ regNo: "", gate: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const pickerRef = useRef(null);
  const isEntry = mode === "entry";

  const activeGates = configuration.gates.filter((gate) => gate.status === "ACTIVE");
  // Entry candidates are active vehicles outside; exit candidates are those inside.
  const candidates = vehicles.filter((v) =>
    isEntry ? v.registrationStatus === "ACTIVE" && v.currentStatus === "OUTSIDE" : v.currentStatus === "INSIDE"
  );

  const query = pickerQuery.trim().toUpperCase();
  const pickerMatches = candidates.filter(
    (v) => !query || v.regNo.toUpperCase().includes(query) || (v.owner ?? "").toUpperCase().includes(query)
  );

  // Close the vehicle picker on outside click or Escape, and clear its search.
  useEffect(() => {
    if (!pickerOpen) {
      setPickerQuery("");
      return;
    }
    const onPointer = (e) => {
      if (!pickerRef.current?.contains(e.target)) setPickerOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [pickerOpen]);

  // Default to the first active gate once configuration arrives, and fall back if
  // the selected gate is closed while the form is open.
  const fallbackGate = activeGates.some((gate) => gate.name === form.gate)
    ? form.gate
    : activeGates[0]?.name ?? "";
  useEffect(() => {
    if (fallbackGate !== form.gate) setForm((f) => ({ ...f, gate: fallbackGate }));
  }, [fallbackGate, form.gate]);

  // Switching between entry and exit starts a fresh form.
  useEffect(() => {
    setResult(null);
    setPickerOpen(false);
    setForm((f) => ({ ...f, regNo: "" }));
  }, [mode]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const response = await (isEntry ? submitEntry(form) : submitExit(form));
    setBusy(false);
    setResult(response);
    if (response.ok) setForm((f) => ({ ...f, regNo: "" }));
  };

  const ModeIcon = isEntry ? DoorOpen : DoorClosed;

  return (
    <div className="grid gap-6 xl:grid-cols-[400px_1fr]">
      {/* Form card */}
      <div className="glass-card">
        <div className="mb-5 flex items-center gap-3">
          <div className={`grid h-10 w-10 place-items-center rounded-full ${isEntry ? "bg-violet-500/15" : "bg-sky-500/15"}`}>
            <ModeIcon size={18} className={isEntry ? "text-violet-300" : "text-sky-300"} />
          </div>
          <div>
            <h1 className="font-bold text-zinc-100">
              {isEntry ? "Record Vehicle Entry" : "Record Vehicle Exit"}
            </h1>
            <p className="text-xs text-zinc-500">Vehicle movement management</p>
          </div>
        </div>

        <form onSubmit={submit} className="grid gap-4">
          <div ref={pickerRef} className="relative">
            <Input
              label="Vehicle Registration Number"
              value={form.regNo}
              onChange={(e) => setForm({ ...form, regNo: e.target.value.toUpperCase() })}
              required
              placeholder="e.g. MH12AB1234"
              className="pr-11"
            />
            {/* Pick from the registered vehicles this action applies to */}
            <button
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              title={isEntry ? "Select a registered vehicle" : "Select a vehicle inside"}
              aria-label="Select registered vehicle"
              aria-expanded={pickerOpen}
              className={`absolute bottom-1.5 right-1.5 grid h-8 w-8 place-items-center rounded-lg transition ${
                pickerOpen ? "bg-violet-500/20 text-violet-300" : "text-zinc-500 hover:bg-white/8 hover:text-zinc-200"
              }`}
            >
              <ListFilter size={15} />
            </button>
            {pickerOpen && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-xl border border-white/10 bg-[var(--surface-2)] p-2 shadow-xl shadow-black/40">
                <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/5 px-2.5 py-1.5">
                  <Search size={13} className="text-zinc-500" />
                  <input
                    autoFocus
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Search number or owner"
                    className="w-full bg-transparent text-xs text-zinc-100 outline-none placeholder:text-zinc-600"
                  />
                </div>
                <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {isEntry ? "Registered vehicles outside" : "Vehicles inside"}
                </p>
                <ul className="max-h-56 overflow-y-auto">
                  {pickerMatches.length === 0 && (
                    <li className="px-2 py-3 text-center text-xs text-zinc-500">No matching vehicles</li>
                  )}
                  {pickerMatches.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, regNo: v.regNo }));
                          setPickerOpen(false);
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                          form.regNo === v.regNo ? "bg-violet-500/15 text-violet-300" : "text-zinc-200 hover:bg-white/8"
                        }`}
                      >
                        <span className="font-mono text-xs font-semibold">{v.regNo}</span>
                        <span className="truncate text-[11px] text-zinc-500">
                          {[v.owner, v.type].filter(Boolean).join(" · ")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Select
            label="Gate"
            value={form.gate}
            onChange={(e) => setForm({ ...form, gate: e.target.value })}
            required
          >
            {activeGates.length === 0 && <option value="">No active gates</option>}
            {activeGates.map((gate) => (
              <option key={gate.id}>{gate.name}</option>
            ))}
          </Select>
          <Input
            label={isEntry ? "Entry Time" : "Exit Time"}
            value={now.toLocaleString("en-IN", { hour12: false, dateStyle: "medium", timeStyle: "short" })}
            readOnly
          />
          <Button
            type="submit"
            variant={isEntry ? "primary" : "secondary"}
            className="w-full py-2.5"
            disabled={busy || !form.gate}
          >
            <CheckCircle2 size={15} />
            {busy ? "Validating…" : `Validate & Record ${isEntry ? "Entry" : "Exit"}`}
          </Button>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`mt-5 rounded-xl border p-4 ${
              result.ok
                ? "border-lime-400/20 bg-lime-400/8"
                : "border-red-500/20 bg-red-500/8"
            }`}
          >
            <div className="flex items-center gap-2">
              {result.ok ? (
                <CheckCircle2 size={16} className="text-lime-400" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
              <p
                className={`text-sm font-bold ${result.ok ? "text-lime-300" : "text-red-300"}`}
              >
                {result.message}
              </p>
            </div>
            {result.movement && (
              <div className="mt-3 grid gap-2 text-xs text-zinc-400 sm:grid-cols-2">
                <span>
                  Vehicle: <b className="text-zinc-200">{result.movement.regNo}</b>
                </span>
                <span>
                  Gate: <b className="text-zinc-200">{result.movement.gate}</b>
                </span>
                <span className="flex items-center gap-1">
                  Type: <Badge>{result.movement.type}</Badge>
                </span>
                <span>
                  Duration:{" "}
                  <b className="text-zinc-200">
                    {result.movement.stayDuration || "In progress"}
                  </b>
                </span>
              </div>
            )}
            {result.alert && (
              <div className="mt-3 flex gap-2">
                <Badge>{result.alert.type}</Badge>
                <Badge>{result.alert.severity}</Badge>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Workflow steps */}
      <div className="glass-card">
        <h2 className="mb-5 font-bold text-zinc-100">Workflow steps</h2>
        <ol className="grid gap-3">
          {(isEntry ? entrySteps : exitSteps).map((step, i) => (
            <li key={step} className="flex items-center gap-3 text-sm text-zinc-400">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/8 text-xs font-bold text-zinc-300">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
