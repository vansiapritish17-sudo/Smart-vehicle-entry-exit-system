import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, ListChecks, Minus, Search, X } from "lucide-react";
import AnimatedNumber from "../components/common/AnimatedNumber";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { belongsTo, eventTime, formatMinutes, localToday, minutesSince } from "../services/dashboardService";

// Matches the backend's VehicleService.normalizeRegNo, so the live lookup agrees with the server.
const normalize = (regNo) => (regNo ?? "").replace(/[\s-]/g, "").toUpperCase();

export default function MovementForm({ mode }) {
  const { configuration, vehicles, movements, submitEntry, submitExit } = useApp();
  const [form, setForm] = useState({ regNo: "", gate: "" });
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const pickerRef = useRef(null);
  const plateRef = useRef(null);
  const isEntry = mode === "entry";
  const accent = isEntry ? "text-violet-400" : "text-sky-400";

  const activeGates = configuration.gates.filter((gate) => gate.status === "ACTIVE");
  const capacity = Number(configuration.maximumCapacity) || 0;
  const inside = vehicles.filter((v) => v.currentStatus === "INSIDE").length;

  // Entry candidates are active vehicles outside; exit candidates are those inside.
  const candidates = vehicles.filter((v) =>
    isEntry ? v.registrationStatus === "ACTIVE" && v.currentStatus === "OUTSIDE" : v.currentStatus === "INSIDE"
  );

  const typed = normalize(form.regNo);
  const match = typed ? vehicles.find((v) => normalize(v.regNo) === typed) : null;

  // For an exit, the open entry this movement will close.
  const openEntry = useMemo(() => {
    if (isEntry || !match) return null;
    return movements
      .filter((m) => m.type === "ENTRY" && belongsTo(m, match) && !m.exitTime)
      .sort((a, b) => (b.entryTime ?? "").localeCompare(a.entryTime ?? ""))[0] ?? null;
  }, [isEntry, match, movements]);

  const recent = useMemo(
    () =>
      movements
        .filter((m) => m.type === (isEntry ? "ENTRY" : "EXIT"))
        .sort((a, b) => eventTime(b).localeCompare(eventTime(a)))
        .slice(0, 6),
    [isEntry, movements]
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

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const response = await (isEntry ? submitEntry(form) : submitExit(form));
    setBusy(false);
    setResult(response);
    if (response.ok) {
      setForm((f) => ({ ...f, regNo: "" }));
      plateRef.current?.focus();
    }
  };

  const pick = (regNo) => {
    setForm((f) => ({ ...f, regNo }));
    setPickerOpen(false);
    plateRef.current?.focus();
  };

  // The same rules the server applies, evaluated live against the register.
  // "idle" until there is a plate to check.
  const verdict = (ok) => (ok ? "pass" : "fail");
  const checks = isEntry
    ? [
        {
          label: "In the vehicle register",
          state: typed ? verdict(Boolean(match)) : "idle",
          detail: typed && !match ? "Not registered — the attempt will be logged as unauthorised" : null,
        },
        {
          label: "Registration is active",
          state: match ? verdict(match.registrationStatus === "ACTIVE") : "idle",
          detail: match && match.registrationStatus !== "ACTIVE" ? "Registration is inactive" : null,
        },
        {
          label: "Not already inside",
          state: match ? verdict(match.currentStatus !== "INSIDE") : "idle",
          detail: match?.currentStatus === "INSIDE" ? "Already recorded inside — duplicate entry" : null,
        },
        {
          label: "Space available",
          state: verdict(inside < capacity),
          detail: `${inside} of ${capacity} spaces in use`,
        },
      ]
    : [
        {
          label: "In the vehicle register",
          state: typed ? verdict(Boolean(match)) : "idle",
          detail: typed && !match ? "Not registered — the exit will be refused" : null,
        },
        {
          label: "Recorded inside",
          state: match ? verdict(match.currentStatus === "INSIDE") : "idle",
          detail: match && match.currentStatus !== "INSIDE" ? "No open entry for this vehicle" : null,
        },
      ];
  const blocked = checks.some((c) => c.state === "fail");

  return (
    <div className="grid gap-6">
      {/* ── Page header ── */}
      <header>
        <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${accent}`}>
          Gate operations · {isEntry ? "Inbound" : "Outbound"}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          {isEntry ? "Record entry" : "Record exit"}
        </h1>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid min-w-0 gap-6">
        {/* ── Console ── */}
        <section className="glass-card p-0!">
          <form onSubmit={submit}>
            <div className="grid gap-7 p-5 sm:p-6">
              {/* Vehicle */}
              <div ref={pickerRef} className="relative">
                <FieldLabel n="01" htmlFor="movement-regno">Registration number</FieldLabel>
                <div className="relative mt-2.5">
                  <input
                    id="movement-regno"
                    ref={plateRef}
                    value={form.regNo}
                    onChange={(e) => setForm({ ...form, regNo: e.target.value.toUpperCase() })}
                    required
                    autoFocus
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="MH12AB1234"
                    className="h-14 w-full rounded-lg border border-white/10 bg-[var(--bg)] pl-4 pr-24 font-mono text-lg sm:pr-36 sm:text-xl font-bold uppercase tracking-[0.14em] text-zinc-100 outline-none transition placeholder:font-medium placeholder:text-zinc-700 hover:border-white/20 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setPickerOpen((open) => !open)}
                    aria-expanded={pickerOpen}
                    aria-haspopup="listbox"
                    aria-label="Choose a registered vehicle"
                    className={`absolute right-2 top-1/2 flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition ${
                      pickerOpen
                        ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                        : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
                    }`}
                  >
                    <ListChecks size={14} className="sm:hidden" />
                    <span className="hidden sm:inline">Registered</span>
                    <span className="font-mono text-[10px] text-zinc-500">{candidates.length}</span>
                    <ChevronDown size={13} className={`transition-transform ${pickerOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {pickerOpen && (
                  <VehiclePicker
                    title={isEntry ? "Registered vehicles outside" : "Vehicles inside"}
                    query={pickerQuery}
                    setQuery={setPickerQuery}
                    matches={pickerMatches}
                    selected={typed}
                    onPick={pick}
                  />
                )}

                <RegisterLookup typed={typed} match={match} openEntry={openEntry} isEntry={isEntry} />
              </div>

              {/* Gate */}
              <div>
                <FieldLabel n="02">Gate</FieldLabel>
                {activeGates.length === 0 ? (
                  <p className="mt-2.5 border-l-2 border-amber-500 bg-amber-500/[0.07] px-3.5 py-2.5 text-sm text-amber-200">
                    No gate is open. An administrator can open one in Settings.
                  </p>
                ) : (
                  <div role="radiogroup" aria-label="Gate" className="mt-2.5 flex flex-wrap gap-2">
                    {activeGates.map((gate) => {
                      const selected = form.gate === gate.name;
                      return (
                        <button
                          key={gate.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setForm((f) => ({ ...f, gate: gate.name }))}
                          className={`h-10 rounded-lg border px-4 text-sm font-medium transition ${
                            selected
                              ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                              : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-100"
                          }`}
                        >
                          {gate.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Action bar */}
            <div className="flex flex-col-reverse gap-3 border-t border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-xs leading-relaxed text-zinc-500">
                {blocked
                  ? "This attempt will be refused and logged as an alert."
                  : "Time is stamped by the server when recorded."}
              </p>
              <button
                type="submit"
                disabled={busy || !form.gate}
                className="group flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-100"
              >
                {busy ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                    Validating…
                  </>
                ) : (
                  <>
                    {isEntry ? "Record entry" : "Record exit"}
                    <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {result && <Receipt result={result} onDismiss={() => setResult(null)} />}
        </section>

        <section className="grid gap-3">
          <SectionTitle>{isEntry ? "Recent entries" : "Recent exits"}</SectionTitle>
          <Table
            columns={[
              {
                key: "regNo",
                label: "Vehicle",
                render: (m) => <span className="font-mono font-semibold tracking-wider text-zinc-100">{m.regNo}</span>,
              },
              { key: "owner", label: "Owner" },
              { key: "gate", label: "Gate" },
              ...(isEntry ? [] : [{ key: "stayDuration", label: "Stay" }]),
              { key: "operator", label: "Operator" },
              { key: "time", label: "Time", render: (m) => <Stamp value={eventTime(m)} /> },
            ]}
            rows={recent}
            empty={isEntry ? "No entries recorded yet." : "No exits recorded yet."}
          />
        </section>
        </div>

        {/* ── Side column ── */}
        <aside className="grid gap-6">
          <OccupancyCard inside={inside} capacity={capacity} threshold={Number(configuration.alertThreshold) || 80} />

          <section className="glass-card">
            <SectionTitle>Gate checks</SectionTitle>
            <ul className="mt-4 grid gap-3.5">
              {checks.map((check) => (
                <CheckRow key={check.label} {...check} />
              ))}
            </ul>
            <p className="mt-5 border-t border-white/[0.06] pt-3.5 text-[11px] leading-relaxed text-zinc-600">
              Checked against the live register. The server makes the final decision.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

/* ── Occupancy at a glance, at the top of the side column ── */
function OccupancyCard({ inside, capacity, threshold }) {
  const percent = capacity ? Math.min(100, Math.round((inside / capacity) * 100)) : 0;
  const high = percent >= threshold;
  const free = Math.max(0, capacity - inside);
  return (
    <section className="glass-card">
      <SectionTitle>Occupancy</SectionTitle>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-zinc-100">
          <AnimatedNumber value={inside} />
          <span className="text-lg text-zinc-600"> / {capacity}</span>
        </p>
        <span className={`text-xs font-medium ${high ? "text-amber-300" : "text-lime-300"}`}>
          {free} space{free === 1 ? "" : "s"} free
        </span>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${high ? "bg-amber-400" : "bg-lime-300"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </section>
  );
}

function FieldLabel({ n, htmlFor, children }) {
  const Tag = htmlFor ? "label" : "p";
  return (
    <Tag htmlFor={htmlFor} className="flex items-baseline gap-2 text-[13px] font-medium text-zinc-300">
      <span className="font-mono text-[11px] text-lime-300">{n}</span>
      {children}
    </Tag>
  );
}

function SectionTitle({ children }) {
  return <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">{children}</h2>;
}

/* ── What the register says about the typed plate ── */
function RegisterLookup({ typed, match, openEntry, isEntry }) {
  if (!typed) {
    return <p className="mt-2.5 text-xs text-zinc-600">Type the plate, or choose from registered vehicles.</p>;
  }
  if (!match) {
    return (
      <p className="mt-2.5 flex items-center gap-2 text-xs text-amber-300">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Not found in the vehicle register
      </p>
    );
  }
  const vehicleLine = [match.type, match.model, match.color].filter(Boolean).join(" · ");
  const onSite = !isEntry && openEntry ? formatMinutes(minutesSince(openEntry.entryTime)) : null;
  return (
    <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm sm:grid-cols-4">
      <Detail label="Owner" value={match.owner} />
      <Detail label="Vehicle" value={vehicleLine || "—"} />
      <Detail
        label="Registration"
        value={match.registrationStatus === "ACTIVE" ? "Active" : "Inactive"}
        tone={match.registrationStatus === "ACTIVE" ? "text-lime-300" : "text-red-300"}
      />
      {onSite ? (
        <Detail label="On site for" value={onSite} />
      ) : (
        <Detail label="Location" value={match.currentStatus === "INSIDE" ? "Inside" : "Outside"} />
      )}
    </dl>
  );
}

function Detail({ label, value, tone = "text-zinc-200" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] text-zinc-500">{label}</dt>
      <dd className={`mt-0.5 truncate font-medium ${tone}`}>{value}</dd>
    </div>
  );
}

function VehiclePicker({ title, query, setQuery, matches, selected, onPick }) {
  return (
    <div className="absolute left-0 right-0 z-20 mt-1.5 overflow-hidden rounded-lg border border-white/10 bg-[var(--surface-2)] shadow-[0_18px_40px_-12px_rgba(0,0,0,0.7)]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3">
        <Search size={14} className="shrink-0 text-zinc-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search plate or owner"
          aria-label="Search registered vehicles"
          className="h-10 w-full bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
        />
      </div>
      <p className="px-3 pb-1 pt-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">{title}</p>
      <ul role="listbox" className="max-h-60 overflow-y-auto px-1.5 pb-1.5">
        {matches.length === 0 && <li className="px-2 py-4 text-center text-xs text-zinc-500">No matching vehicles</li>}
        {matches.map((v) => {
          const active = normalize(v.regNo) === selected;
          return (
            <li key={v.id} role="option" aria-selected={active}>
              <button
                type="button"
                onClick={() => onPick(v.regNo)}
                className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition ${
                  active ? "bg-violet-500/15 text-violet-200" : "text-zinc-200 hover:bg-white/[0.06]"
                }`}
              >
                <span className="font-mono text-sm font-semibold tracking-wider">{v.regNo}</span>
                <span className="truncate text-xs text-zinc-500">{[v.owner, v.type].filter(Boolean).join(" · ")}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CheckRow({ label, state, detail }) {
  const icon = {
    pass: { el: <Check size={12} strokeWidth={3} />, cls: "bg-lime-300/15 text-lime-300" },
    fail: { el: <X size={12} strokeWidth={3} />, cls: "bg-red-500/15 text-red-300" },
    idle: { el: <Minus size={12} strokeWidth={3} />, cls: "bg-white/[0.06] text-zinc-600" },
  }[state];
  return (
    <li className="flex gap-3">
      <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${icon.cls}`}>{icon.el}</span>
      <div className="min-w-0">
        <p className={`text-sm ${state === "idle" ? "text-zinc-500" : "text-zinc-200"}`}>{label}</p>
        {detail && (
          <p className={`mt-0.5 text-xs ${state === "fail" ? "text-red-300/80" : "text-zinc-500"}`}>{detail}</p>
        )}
      </div>
    </li>
  );
}

/* ── The server's verdict, laid out like a gate slip ── */
function Receipt({ result, onDismiss }) {
  const m = result.movement;
  const rows = m
    ? [
        ["Vehicle", m.regNo],
        ["Owner", m.owner],
        ["Gate", m.gate],
        [m.type === "EXIT" ? "Exit time" : "Entry time", m.type === "EXIT" ? m.exitTime : m.entryTime],
        ...(m.type === "EXIT" ? [["Stay", m.stayDuration]] : []),
        ["Operator", m.operator],
      ].filter(([, v]) => v)
    : result.alert
      ? [
          ["Vehicle", result.alert.vehicle],
          ["Gate", result.alert.gate],
          ["Alert", result.alert.type?.replaceAll("_", " ")],
          ["Severity", result.alert.severity],
        ].filter(([, v]) => v)
      : [];

  return (
    <div
      role="status"
      className={`animate-fade-up rounded-b-[15px] border-t border-l-2 border-t-white/[0.06] px-5 py-4 sm:px-6 ${
        result.ok ? "border-l-lime-300 bg-lime-300/[0.04]" : "border-l-red-500 bg-red-500/[0.05]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`font-mono text-[11px] uppercase tracking-[0.16em] ${result.ok ? "text-lime-300" : "text-red-300"}`}>
            {result.ok ? "Recorded" : "Refused"}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-100">{result.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-200"
        >
          <X size={14} />
        </button>
      </div>
      {rows.length > 0 && (
        <dl className="mt-3.5 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] text-zinc-500">{label}</dt>
              <dd className="mt-0.5 truncate font-mono text-[13px] text-zinc-200">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

/* Time of day for today's records, date and time for older ones. */
function Stamp({ value }) {
  if (!value) return <span className="font-mono text-xs text-zinc-600">—</span>;
  const today = value.startsWith(localToday());
  return (
    <time className="shrink-0 text-right font-mono text-xs tabular-nums text-zinc-500" dateTime={value.replace(" ", "T")}>
      {today ? value.slice(11, 16) : `${value.slice(8, 10)}/${value.slice(5, 7)} ${value.slice(11, 16)}`}
    </time>
  );
}
