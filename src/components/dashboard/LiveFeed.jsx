import { useEffect, useRef, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Radio, ShieldAlert, TriangleAlert } from "lucide-react";
import { EmptyState, Skeleton } from "../common/PageHeader";
import { localToday, parseStamp } from "../../services/dashboardService";

const FRESH_MS = 2600; // how long a new row keeps its arrival highlight

const KIND = {
  ENTRY: { icon: ArrowUpRight, label: "Entry", tone: "bg-violet-500/15 text-violet-300", flash: "rgba(139, 92, 246, 0.16)" },
  EXIT: { icon: ArrowDownLeft, label: "Exit", tone: "bg-sky-500/15 text-sky-300", flash: "rgba(14, 165, 233, 0.14)" },
  ALERT: { icon: ShieldAlert, label: "Refused", tone: "bg-red-500/15 text-red-300", flash: "rgba(239, 68, 68, 0.16)", accent: "text-red-300" },
  WARNING: { icon: TriangleAlert, label: "Warning", tone: "bg-amber-500/15 text-amber-300", flash: "rgba(245, 158, 11, 0.16)", accent: "text-amber-300" },
};

/** "just now", "12 min ago", then the clock time; older days get a date. */
function when(stamp, now) {
  const at = parseStamp(stamp);
  if (!at) return "—";
  const minutes = Math.floor((now - at.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  return stamp.startsWith(localToday()) ? stamp.slice(11, 16) : `${stamp.slice(8, 10)}/${stamp.slice(5, 7)} ${stamp.slice(11, 16)}`;
}

/**
 * Everything happening at the gates, newest first. Rows that arrive while the
 * page is open slide in and briefly light up — the live part of the demo.
 */
export default function LiveFeed({ events, loading }) {
  const arrivals = useRef(new Map()); // id -> when this browser first saw it
  const primed = useRef(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  // What is already there on first load is history, not news.
  if (!loading && !primed.current) {
    events.forEach((e) => arrivals.current.set(e.id, 0));
    primed.current = true;
  }
  const renderedAt = Date.now();
  events.forEach((e) => {
    if (!arrivals.current.has(e.id)) arrivals.current.set(e.id, renderedAt);
  });

  if (loading) {
    return (
      <ul className="grid gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <li key={i} className="flex items-center gap-3 px-2 py-2.5">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  if (!events.length) {
    return (
      <EmptyState icon={Radio} title="Waiting for the first movement">
        Entries, exits and refused attempts appear here the moment they are recorded.
      </EmptyState>
    );
  }

  return (
    <ul className="grid gap-0.5">
      {events.map((event) => {
        const kind = KIND[event.kind] ?? KIND.ENTRY;
        const Icon = kind.icon;
        const fresh = renderedAt - (arrivals.current.get(event.id) ?? 0) < FRESH_MS;
        return (
          <li
            key={event.id}
            className={`flex items-center gap-3 rounded-lg px-2 py-2.5 ${fresh ? "feed-new" : ""}`}
            style={fresh ? { "--feed-flash": kind.flash } : undefined}
          >
            <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${kind.tone}`}>
              <Icon size={14} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-baseline gap-2">
                <span className="font-mono text-sm font-semibold tracking-wider text-zinc-100">{event.regNo || "—"}</span>
                <span className={`text-[11px] font-medium ${kind.accent ?? "text-zinc-500"}`}>
                  {kind.label}
                </span>
              </p>
              <p className="truncate text-xs text-zinc-500">
                {[event.detail, event.gate].filter(Boolean).join(" · ")}
              </p>
            </div>
            <time className="shrink-0 font-mono text-[11px] tabular-nums text-zinc-500" dateTime={event.time?.replace(" ", "T")}>
              {when(event.time, now)}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
