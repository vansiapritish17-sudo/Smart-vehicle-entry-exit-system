import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import Mark from "../components/common/Mark";
import apiClient from "../services/apiClient";
import { useApp } from "../state/AppContext";

export default function Login() {
  const { signIn, currentUser, authReady } = useApp();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // A restored Firebase session should land on the dashboard, not the login form.
  useEffect(() => {
    if (authReady && currentUser) navigate("/dashboard", { replace: true });
  }, [authReady, currentUser, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await signIn(form.username, form.password);
      if (result.ok) navigate("/dashboard", { replace: true });
      else setError(result.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[var(--bg)] text-zinc-100 lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      {/* ── Sign-in side ── */}
      <main className="flex min-h-screen flex-col px-6 py-6 sm:px-10 sm:py-8 lg:py-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 lg:invisible">
            <Mark />
            <span className="text-sm font-bold tracking-[0.18em]">BARBICAN</span>
          </div>
          <ServerStatus />
        </div>

        <div className="auth-enter mx-auto my-auto w-full max-w-[360px] py-12">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-400">
            Gatehouse access
          </p>
          <h2 className="mt-3 text-[1.75rem] font-semibold leading-tight tracking-tight">
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">
            Use the credentials issued by your administrator.
          </p>

          <form className="mt-8 grid gap-5" onSubmit={submit}>
            <Field
              id="login-username"
              label="Username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              autoFocus
            />

            <Field
              id="login-password"
              label="Password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />

            {error && (
              <p
                role="alert"
                className="animate-fade-up border-l-2 border-red-500 bg-red-500/[0.07] px-3.5 py-2.5 text-sm text-red-300"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              id="btn-login"
              disabled={busy}
              className="group mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-zinc-100"
            >
              {busy ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-zinc-600">
            Forgot your password? An administrator can issue a new one from User Management.
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-600">
          <span>SVEMS · Barbican</span>
          <span>Secured by Firebase Authentication</span>
        </footer>
      </main>
    </div>
  );
}

/* ── Left half: identity, the plate motif, and what the system does ── */
function BrandPanel() {
  return (
    <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-white/[0.06] bg-[var(--surface)] px-12 py-10 lg:flex xl:px-16">
      <div className="auth-enter flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="text-sm font-bold tracking-[0.18em]">BARBICAN</span>
        </div>
        <Clock />
      </div>

      <div className="max-w-xl">
        <div className="auth-enter auth-delay-1">
          <Plate />
        </div>

        <h1 className="auth-enter auth-delay-2 mt-14 text-[3.25rem] font-semibold leading-[1.02] tracking-[-0.035em] xl:text-[3.75rem]">
          Every vehicle,
          <br />
          <span className="text-zinc-500">accounted for.</span>
        </h1>
        <p className="auth-enter auth-delay-2 mt-6 max-w-md text-[15px] leading-relaxed text-zinc-400">
          A barbican is the fortified gatehouse of a castle — the one place where
          everything coming in or going out is checked. This one checks registrations
          at the gate, tracks occupancy live, and keeps the full record.
        </p>
      </div>

      <div className="auth-enter auth-delay-3">
        <div className="auth-hazard h-1.5 w-full rounded-sm" aria-hidden />
        <dl className="mt-6 grid grid-cols-3 gap-8">
          {[
            ["01", "Gate control", "Entries and exits validated against the register."],
            ["02", "Live capacity", "Alerts before the facility fills up."],
            ["03", "Audit trail", "Every movement, gate and operator on record."],
          ].map(([n, title, body]) => (
            <div key={n}>
              <dt className="flex items-baseline gap-2 text-sm font-semibold text-zinc-200">
                <span className="font-mono text-[11px] text-lime-300">{n}</span>
                {title}
              </dt>
              <dd className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{body}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}

/* ── A high-security registration plate, read once by the gate camera on load ──
   Each visit it arrives carrying a random registration. The camera reads it, the
   verdict lands, then the characters decode into BARBICAN and the two spare
   slots fold away. One pass only, like the rest of this screen. */
const PLATE_TARGET = " BARBICAN "; // padded to the 10 slots of an Indian registration
const PLATE_STATES = ["MH", "KA", "DL", "TN", "GJ", "RJ", "UP", "WB", "KL", "HR", "PB", "TS", "AP", "MP"];
const PLATE_SERIES = "ABCDEFGHJKLMNPRSTUVWXYZ"; // I and O are not issued
const PLATE_GLYPHS = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";

const pickFrom = (chars) => chars[Math.floor(Math.random() * chars.length)];
const digits = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join("");

function randomPlate() {
  const district = String(1 + Math.floor(Math.random() * 50)).padStart(2, "0");
  const number = String(1 + Math.floor(Math.random() * 9999)).padStart(4, "0");
  return pickFrom(PLATE_STATES) + district + pickFrom(PLATE_SERIES) + pickFrom(PLATE_SERIES) + number;
}

// Timeline in ms from mount; the scan sweep (CSS) runs 500–1900 and the verdict lands at 1900.
const DECODE_START = 2200;
const DECODE_STAGGER = 70; // left to right
const DECODE_SCRAMBLE = 280; // how long each slot flickers before it locks
const GLYPH_INTERVAL = 50; // ~20 glyph changes a second reads as flicker, not noise

function useDecodedPlate() {
  const [plate] = useState(randomPlate);
  const [chars, setChars] = useState(() => plate.split(""));
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(PLATE_TARGET.split(""));
      setSettled(true);
      return;
    }
    const startedAt = performance.now();
    let lastGlyph = 0;
    let frame;
    const tick = (now) => {
      const t = now - startedAt;
      if (t >= DECODE_START && now - lastGlyph >= GLYPH_INTERVAL) {
        lastGlyph = now;
        let locked = 0;
        setChars(
          plate.split("").map((original, i) => {
            const begins = DECODE_START + i * DECODE_STAGGER;
            if (t >= begins + DECODE_SCRAMBLE) {
              locked += 1;
              return PLATE_TARGET[i];
            }
            return t >= begins ? pickFrom(PLATE_GLYPHS) : original;
          })
        );
        if (locked === plate.length) {
          setSettled(true);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [plate]);

  return { chars, settled };
}

function Plate() {
  const { chars, settled } = useDecodedPlate();
  return (
    <div className="inline-block">
      <div className="relative overflow-hidden rounded-[10px] bg-[#f4f4f5] p-[3px] shadow-[0_18px_40px_-24px_rgba(0,0,0,0.8)]">
        <div className="flex items-stretch rounded-[7px] border-2 border-[#18181b]">
          <div className="flex w-9 flex-col items-center justify-center gap-1 bg-[#1d3f9e] text-on-accent">
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
              {Array.from({ length: 12 }, (_, i) => (
                <line
                  key={i}
                  x1="10" y1="10"
                  x2={10 + 7.5 * Math.cos((i * Math.PI) / 6)}
                  y2={10 + 7.5 * Math.sin((i * Math.PI) / 6)}
                  stroke="currentColor" strokeWidth="0.8"
                />
              ))}
            </svg>
            <span className="text-[9px] font-bold tracking-wider">IND</span>
          </div>
          <span
            role="img"
            aria-label="Barbican"
            className="flex px-6 py-3 font-mono text-[2.1rem] font-bold leading-none text-[#09090b]"
          >
            {chars.map((char, i) => {
              // The padding slots collapse once BARBICAN has locked in.
              const folded = settled && PLATE_TARGET[i] === " ";
              return (
                <span
                  key={i}
                  aria-hidden
                  className="inline-block overflow-hidden text-center transition-[width,opacity] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: folded ? 0 : "0.74em", opacity: folded ? 0 : 1 }}
                >
                  {char === " " ? " " : char}
                </span>
              );
            })}
          </span>
        </div>
        <span aria-hidden className="auth-plate-scan pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-violet-500 shadow-[0_0_12px_2px_rgba(139,92,246,0.7)]" />
      </div>
      <div className="auth-plate-verdict mt-4 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        <span className="h-1.5 w-1.5 rounded-full bg-lime-300" />
        Plate read · <span className="text-lime-300">Registered</span>
      </div>
    </div>
  );
}

/* ── Live local time, as on a gatehouse console ── */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <time className="font-mono text-xs tabular-nums text-zinc-500" dateTime={now.toISOString()}>
      {now.toLocaleTimeString("en-IN", { hour12: false, timeZoneName: "short" })}
    </time>
  );
}

/* ── Real reachability of the API, so a sleeping free-tier server is explained ── */
function ServerStatus() {
  const [state, setState] = useState("checking");
  useEffect(() => {
    let alive = true;
    apiClient
      .get("/health")
      .then(() => alive && setState("online"))
      .catch(() => alive && setState("offline"));
    return () => {
      alive = false;
    };
  }, []);

  const view = {
    checking: { dot: "bg-amber-400 pulse-dot", text: "Connecting to server…" },
    online: { dot: "bg-lime-300", text: "Server online" },
    offline: { dot: "bg-red-500", text: "Server unreachable" },
  }[state];

  return (
    <span role="status" className="flex items-center gap-2 font-mono text-[11px] text-zinc-500">
      <span className={`h-1.5 w-1.5 rounded-full ${view.dot}`} />
      {view.text}
    </span>
  );
}

function Field({ id, label, trailing, ...props }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          className={`h-11 w-full rounded-lg border border-white/10 bg-[var(--surface)] px-3.5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 hover:border-white/20 focus:border-violet-500 focus:ring-[3px] focus:ring-violet-500/20 ${
            trailing ? "pr-12" : ""
          }`}
          {...props}
        />
        {trailing && <span className="absolute right-1.5">{trailing}</span>}
      </div>
    </div>
  );
}
