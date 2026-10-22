/*
 * Derived figures for the dashboard, monitoring and history pages. Everything is
 * computed from the live Firestore records; timestamps are the backend's local
 * "yyyy-MM-dd HH:mm" strings.
 */

/** Today's date as "yyyy-MM-dd" in the browser's local zone (matches the stored stamps). */
export function localToday() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** When the movement happened: the exit time for an EXIT, the entry time otherwise. */
export function eventTime(movement) {
  return (movement.type === "EXIT" ? movement.exitTime : movement.entryTime) || "";
}

export function parseStamp(stamp) {
  if (!stamp) return null;
  const parsed = new Date(stamp.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatMinutes(total) {
  if (total == null || Number.isNaN(total)) return "—";
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}

/** Minutes since a stamp, for vehicles still inside. */
export function minutesSince(stamp) {
  const start = parseStamp(stamp);
  return start ? (Date.now() - start.getTime()) / 60000 : null;
}

export function getDashboardStats(vehicles, movements, alerts, configuration) {
  const today = localToday();
  const inside = vehicles.filter((vehicle) => vehicle.currentStatus === "INSIDE").length;
  return {
    registeredVehicles: vehicles.length,
    vehiclesInside: inside,
    vehiclesOutside: vehicles.length - inside,
    currentOccupancy: inside,
    maximumCapacity: Number(configuration.maximumCapacity) || 0,
    todayEntries: movements.filter((m) => m.type === "ENTRY" && m.entryTime?.startsWith(today)).length,
    todayExits: movements.filter((m) => m.type === "EXIT" && m.exitTime?.startsWith(today)).length,
    activeAlerts: alerts.filter((alert) => alert.status === "OPEN").length,
  };
}

/** Entries and exits per day for the last `days` days, including days with no traffic. */
export function chartDataFromMovements(movements, days = 7) {
  const buckets = [];
  const index = {};
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const bucket = { day: key.slice(5), entries: 0, exits: 0 };
    index[key] = bucket;
    buckets.push(bucket);
  }
  movements.forEach((movement) => {
    const bucket = index[eventTime(movement).slice(0, 10)];
    if (!bucket) return;
    if (movement.type === "ENTRY") bucket.entries += 1;
    if (movement.type === "EXIT") bucket.exits += 1;
  });
  return buckets;
}

/** Average stay over completed visits (ENTRY records that have an exit time). */
export function averageStayMinutes(movements) {
  const stays = movements
    .filter((m) => m.type === "ENTRY" && m.exitTime)
    .map((m) => {
      const start = parseStamp(m.entryTime);
      const end = parseStamp(m.exitTime);
      return start && end ? (end - start) / 60000 : null;
    })
    .filter((v) => v != null && v >= 0);
  if (!stays.length) return null;
  return stays.reduce((sum, v) => sum + v, 0) / stays.length;
}

/** Highest number of vehicles inside at once, replaying every recorded entry and exit. */
export function peakOccupancy(movements) {
  const events = movements
    .map((m) => ({ time: eventTime(m), delta: m.type === "ENTRY" ? 1 : m.type === "EXIT" ? -1 : 0 }))
    .filter((e) => e.time && e.delta)
    // Exits before entries on the same minute, so a quick turnaround is not double-counted.
    .sort((a, b) => a.time.localeCompare(b.time) || a.delta - b.delta);
  let current = 0;
  let peak = 0;
  events.forEach((e) => {
    current = Math.max(0, current + e.delta);
    peak = Math.max(peak, current);
  });
  return peak;
}

/** Human labels for the alert types the backend raises. */
export const ALERT_LABELS = {
  UNAUTHORIZED_VEHICLE: "Unauthorized vehicle",
  INACTIVE_VEHICLE: "Inactive registration",
  DUPLICATE_ENTRY: "Duplicate entry",
  INVALID_EXIT: "Invalid exit",
  CAPACITY_WARNING: "Capacity warning",
  CAPACITY_FULL: "Capacity full",
};

/**
 * One stream of everything that happened at the gates: recorded entries and
 * exits, plus alerts (refused attempts and capacity warnings). Newest first.
 */
export function gateEvents(movements, alerts, limit = 8) {
  const events = [
    ...movements.map((m) => ({
      id: `m-${m.id}`,
      kind: m.type,
      regNo: m.regNo,
      gate: m.gate,
      time: eventTime(m),
      detail: m.type === "EXIT" && m.stayDuration ? `Stayed ${m.stayDuration}` : m.owner,
    })),
    ...alerts.map((a) => ({
      id: `a-${a.id}`,
      kind: a.type === "CAPACITY_WARNING" ? "WARNING" : "ALERT",
      severity: a.severity,
      regNo: a.vehicle,
      gate: a.gate,
      time: a.time || "",
      detail: ALERT_LABELS[a.type] ?? a.type,
    })),
  ];
  return events.sort((a, b) => b.time.localeCompare(a.time)).slice(0, limit);
}

/**
 * Whether a movement belongs to a vehicle. Matched on the vehicle's id so a plate
 * corrected after the fact keeps its history; older records without one fall back
 * to the plate.
 */
export function belongsTo(movement, vehicle) {
  return movement.vehicleId ? movement.vehicleId === vehicle.id : movement.regNo === vehicle.regNo;
}
