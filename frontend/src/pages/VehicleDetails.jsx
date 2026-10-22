import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import PageHeader, { EmptyState, SectionTitle, Skeleton } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";
import { averageStayMinutes, belongsTo, formatMinutes, localToday, parseStamp } from "../services/dashboardService";

const TIMELINE_VISITS = 10;
const minutesOfDay = (date) => date.getHours() * 60 + date.getMinutes();

/** A visit drawn on a 24-hour track, from its entry to its exit (or to now if it is still open). */
function VisitRow({ visit, now }) {
  const start = parseStamp(visit.entryTime);
  const end = visit.exitTime ? parseStamp(visit.exitTime) : now;
  if (!start || !end) return null;

  const ongoing = !visit.exitTime;
  const nextDay = end.toDateString() !== start.toDateString();
  const from = (minutesOfDay(start) / 1440) * 100;
  const to = nextDay ? 100 : Math.max(from + 0.6, (minutesOfDay(end) / 1440) * 100); // keep very short visits visible
  const isToday = visit.entryTime.startsWith(localToday());
  const day = isToday
    ? "Today"
    : start.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <li className="grid grid-cols-[64px_minmax(0,1fr)_88px] items-center gap-3 py-2 sm:grid-cols-[72px_minmax(0,1fr)_120px]">
      <span className="text-xs text-zinc-400">{day}</span>
      <div className="relative h-6 rounded-md bg-white/[0.04]">
        <span
          className={`absolute inset-y-1 rounded ${ongoing ? "bg-lime-300/80" : "bg-violet-500/80"}`}
          style={{ left: `${from}%`, width: `${to - from}%` }}
          title={`${visit.entryTime} → ${visit.exitTime || "still inside"}`}
        />
        {ongoing && !nextDay && (
          <span className="pulse-dot absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime-300" style={{ left: `${to}%` }} />
        )}
      </div>
      <span className="text-right font-mono text-xs tabular-nums text-zinc-300">
        {ongoing ? <span className="text-lime-300">on site</span> : visit.stayDuration || formatMinutes((end - start) / 60000)}
        {nextDay && <span className="ml-1 text-zinc-500">+1d</span>}
        <span className="block truncate font-sans text-[11px] text-zinc-500">{visit.gate}</span>
      </span>
    </li>
  );
}

export default function VehicleDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, movements, loading } = useApp();
  const vehicle = vehicles.find((v) => v.id === id);
  // Back to wherever the user came from; operators cannot open /vehicles.
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate("/vehicles/search"));

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  if (!vehicle) {
    return (
      <div className="grid gap-6">
        <PageHeader eyebrow="Vehicle" title={loading ? <Skeleton className="h-7 w-48" /> : "Vehicle not found"} />
        {!loading && (
          <div>
            <Button variant="secondary" onClick={back}>
              <ArrowLeft size={14} /> Back
            </Button>
          </div>
        )}
      </div>
    );
  }

  const rows = movements.filter((m) => belongsTo(m, vehicle));
  // Each ENTRY record is one visit; its exit time is filled in when the vehicle leaves.
  const visits = rows.filter((m) => m.type === "ENTRY" && m.entryTime);
  const completed = visits.filter((v) => v.exitTime);
  const totalMinutes = completed.reduce((sum, v) => {
    const a = parseStamp(v.entryTime);
    const b = parseStamp(v.exitTime);
    return a && b ? sum + Math.max(0, (b - a) / 60000) : sum;
  }, 0);
  const lastSeen = rows[0];
  const lastSeenLabel =
    vehicle.currentStatus === "INSIDE"
      ? "Inside now"
      : lastSeen
        ? (lastSeen.exitTime || lastSeen.entryTime).slice(0, 16)
        : "Never";

  const summary = [
    { label: "Visits", value: visits.length },
    { label: "Average stay", value: formatMinutes(averageStayMinutes(rows)) },
    { label: "Total on site", value: completed.length ? formatMinutes(totalMinutes) : "—" },
    { label: "Last seen", value: lastSeenLabel, mono: true },
  ];

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Vehicle"
        title={<span className="font-mono tracking-wider">{vehicle.regNo}</span>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {[vehicle.owner, vehicle.type, [vehicle.color, vehicle.model].filter(Boolean).join(" "), vehicle.contact]
              .filter(Boolean)
              .join(" · ")}
            <Badge>{vehicle.registrationStatus}</Badge>
            <Badge>{vehicle.currentStatus}</Badge>
          </span>
        }
        actions={
          <Button variant="secondary" onClick={back}>
            <ArrowLeft size={14} /> Back
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summary.map(({ label, value, mono }) => (
          <div key={label} className="glass-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
            <p className={`mt-2 font-semibold tracking-tight text-zinc-100 ${mono ? "font-mono text-lg" : "text-3xl"}`}>{value}</p>
          </div>
        ))}
      </div>

      <section className="glass-card">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <SectionTitle>Visit timeline · {Math.min(TIMELINE_VISITS, visits.length)} most recent</SectionTitle>
          <div className="flex gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-violet-500/80" /> Completed</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-3 rounded-sm bg-lime-300/80" /> On site</span>
          </div>
        </div>
        {visits.length ? (
          <>
            {/* Hour axis, aligned with the track column */}
            <div className="mt-4 grid grid-cols-[64px_minmax(0,1fr)_88px] gap-3 sm:grid-cols-[72px_minmax(0,1fr)_120px]">
              <span />
              <div className="flex justify-between font-mono text-[10px] text-zinc-600">
                {["00", "06", "12", "18", "24"].map((h) => (
                  <span key={h}>{h}</span>
                ))}
              </div>
              <span />
            </div>
            <ul className="mt-1 divide-y divide-white/[0.05]">
              {visits.slice(0, TIMELINE_VISITS).map((visit) => (
                <VisitRow key={visit.id} visit={visit} now={now} />
              ))}
            </ul>
          </>
        ) : (
          <EmptyState icon={CalendarClock} title="No visits yet" className="mt-4">
            Each time this vehicle enters, the visit is drawn here from entry to exit.
          </EmptyState>
        )}
      </section>

      <section className="grid gap-3">
        <SectionTitle>All movements · {rows.length}</SectionTitle>
        <Table
          columns={[
            { key: "type", label: "Movement", render: (row) => <Badge>{row.type}</Badge> },
            { key: "gate", label: "Gate" },
            { key: "entryTime", label: "Entry", render: (row) => <span className="font-mono text-xs">{row.entryTime || "—"}</span> },
            { key: "exitTime", label: "Exit", render: (row) => <span className="font-mono text-xs">{row.exitTime || "—"}</span> },
            { key: "stayDuration", label: "Duration" },
            { key: "operator", label: "Operator" },
          ]}
          rows={rows}
          empty="No movements recorded for this vehicle."
        />
      </section>
    </div>
  );
}
