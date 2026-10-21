import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  ScanLine,
  ShieldCheck,
  User,
} from "lucide-react";
import Button from "../components/common/Button";
import { useApp } from "../state/AppContext";

/* Decorative plates cycled through the scanner animation on the brand panel. */
const SCANNER_PLATES = [
  { plate: "GJ 05 TT 9090", verdict: "AUTHORISED", gate: "Main Gate" },
  { plate: "MH 12 QR 4417", verdict: "AUTHORISED", gate: "North Gate" },
  { plate: "KA 03 MZ 2280", verdict: "VISITOR",    gate: "Service Gate" },
  { plate: "DL 08 CA 7731", verdict: "AUTHORISED", gate: "Main Gate" },
];

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
    <div className="relative min-h-screen overflow-hidden bg-[#09090b]">
      <Backdrop />

      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16 lg:px-8">
        <BrandPanel />

        {/* ── Sign-in card ── */}
        <div className="auth-enter auth-delay-3 w-full justify-self-center lg:justify-self-end">
          {/* Compact wordmark for narrow screens, where the brand panel is hidden */}
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <Crest />
            <div>
              <Wordmark className="text-xl" />
              <p className="text-[11px] tracking-[0.16em] text-zinc-600 uppercase">
                Vehicle Access Intelligence
              </p>
            </div>
          </div>

          <div className="auth-card-glow relative rounded-3xl border border-white/[0.06] bg-[#111113]/85 p-6 shadow-2xl shadow-black/60 backdrop-blur-xl sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-zinc-100">Sign in to the gatehouse</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Authenticate to access live gate control.
              </p>
            </div>

            <form className="grid gap-4" onSubmit={submit}>
              <AuthField
                id="login-username"
                label="Username"
                icon={<User size={15} />}
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                placeholder="Your username"
                required
                autoFocus
              />

              <AuthField
                id="login-password"
                label="Password"
                icon={<KeyRound size={15} />}
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                placeholder="••••••••"
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="grid h-7 w-7 place-items-center rounded-lg text-zinc-500 transition hover:bg-white/8 hover:text-zinc-200"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                }
              />

              {error && (
                <div
                  role="alert"
                  className="animate-fade-up rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                id="btn-login"
                disabled={busy}
                className="group mt-1 w-full rounded-xl py-3 text-base font-bold disabled:opacity-60"
              >
                {busy ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/25 border-t-black" />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight
                      size={16}
                      className="transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                  </>
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[11px] text-zinc-700">
            <ShieldCheck size={12} />
            Secured by Firebase Authentication
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Ambient background: drifting orbs over a receding road grid ── */
function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="auth-grid absolute inset-x-0 bottom-0 h-[62vh] opacity-90" />
      <div
        className="auth-orb absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full opacity-25 blur-3xl"
        style={{ background: "radial-gradient(circle, #7c3aed, transparent 70%)" }}
      />
      <div
        className="auth-orb-slow absolute -bottom-40 -right-24 h-[22rem] w-[22rem] rounded-full opacity-20 blur-3xl"
        style={{ background: "radial-gradient(circle, #a3e635, transparent 70%)" }}
      />
      {/* Soft scrim only at the very top and sides — the road stays visible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_38%,transparent_55%,rgba(9,9,11,0.72)_100%)]" />
    </div>
  );
}

/* ── Left half: identity, the scanner motif, and what the system does ── */
function BrandPanel() {
  return (
    <div className="hidden lg:block">
      <div className="auth-enter auth-delay-1 flex items-center gap-3.5">
        <Crest size="lg" />
        <div>
          <Wordmark className="text-[2.1rem] leading-none" />
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-zinc-600">
            Vehicle Access Intelligence
          </p>
        </div>
      </div>

      <h1 className="auth-enter auth-delay-2 mt-9 max-w-lg text-[2.6rem] font-black leading-[1.08] tracking-tight text-zinc-100">
        Every vehicle
        <br />
        <span className="text-zinc-500">accounted for.</span>
      </h1>

      <p className="auth-enter auth-delay-2 mt-4 max-w-md text-[15px] leading-relaxed text-zinc-500">
        A barbican is the fortified gatehouse of a castle — the one point where
        everything entering or leaving is checked. This is yours.
      </p>

      <div className="auth-enter auth-delay-3 mt-9">
        <PlateScanner />
      </div>

      <div className="auth-enter auth-delay-4 mt-8 flex items-center gap-7">
        <Capability value="24/7" label="Gate monitoring" />
        <span className="h-8 w-px bg-white/8" />
        <Capability value="Live" label="Capacity alerts" />
        <span className="h-8 w-px bg-white/8" />
        <Capability value="Full" label="Audit trail" />
      </div>
    </div>
  );
}

/* ── ANPR motif: a plate being read at the gate, cycling every few seconds ── */
function PlateScanner() {
  const [index, setIndex] = useState(0);
  const [reading, setReading] = useState(true);
  const timers = useRef([]);

  useEffect(() => {
    const cycle = window.setInterval(() => {
      setReading(true);
      const settle = window.setTimeout(() => setReading(false), 2600);
      timers.current.push(settle);
      const advance = window.setTimeout(() => {
        setIndex((i) => (i + 1) % SCANNER_PLATES.length);
      }, 4200);
      timers.current.push(advance);
    }, 4600);

    const first = window.setTimeout(() => setReading(false), 2600);
    timers.current.push(first);

    return () => {
      window.clearInterval(cycle);
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, []);

  const current = SCANNER_PLATES[index];
  const isVisitor = current.verdict === "VISITOR";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111113]/70 p-4 backdrop-blur-sm">
      {/* Camera status strip */}
      <div className="mb-3.5 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">
          <ScanLine size={12} className="text-violet-400" />
          ANPR · {current.gate}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] font-bold text-lime-400">
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime-400" />
          LIVE
        </span>
      </div>

      {/* The plate */}
      <div className="relative overflow-hidden rounded-xl border border-white/15 bg-gradient-to-b from-zinc-100 to-zinc-300 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="grid shrink-0 place-items-center rounded bg-[#1a3fa0] px-1.5 py-2 text-[8px] font-bold leading-none text-white">
            <span className="mb-0.5 text-[10px]">★</span>
            IND
          </div>
          <span className="font-mono text-[1.35rem] font-black tracking-[0.1em] text-zinc-900 tabular-nums">
            {current.plate}
          </span>
        </div>

        {/* Sweeping scan bar */}
        {reading && (
          <div
            aria-hidden
            className="auth-scan pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-transparent via-violet-500 to-transparent shadow-[0_0_14px_3px_rgba(139,92,246,0.65)]"
          />
        )}
      </div>

      {/* Verdict */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[11px] font-medium text-zinc-600">
          {reading ? "Reading plate…" : "Matched against register"}
        </span>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide transition-opacity duration-300 ${
            reading
              ? "bg-zinc-800 text-zinc-600"
              : isVisitor
                ? "bg-amber-400/12 text-amber-300"
                : "bg-lime-400/12 text-lime-400"
          }`}
        >
          {reading ? "SCANNING" : current.verdict}
        </span>
      </div>
    </div>
  );
}

function Capability({ value, label }) {
  return (
    <div>
      <p className="text-lg font-black text-zinc-200">{value}</p>
      <p className="text-[11px] text-zinc-600">{label}</p>
    </div>
  );
}

/* ── Brand atoms ── */
function Crest({ size = "sm" }) {
  const box = size === "lg" ? "h-14 w-14" : "h-11 w-11";
  const icon = size === "lg" ? 24 : 19;
  return (
    <div
      className={`${box} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-lime-300 via-violet-500 to-violet-800 shadow-xl shadow-violet-900/50`}
    >
      <ShieldCheck size={icon} strokeWidth={2.5} className="text-white" />
    </div>
  );
}

function Wordmark({ className = "" }) {
  return (
    <span
      className={`auth-sheen block bg-gradient-to-r from-zinc-100 via-violet-300 to-lime-200 bg-clip-text font-black tracking-[0.02em] text-transparent ${className}`}
    >
      BARBICAN
    </span>
  );
}

/* Label sits outside the input so the icon and the reveal toggle can live inside it. */
function AuthField({ id, label, icon, trailing, className = "", ...props }) {
  return (
    <div className="grid gap-1.5">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500"
      >
        {label}
      </label>
      <div className="group relative flex items-center">
        <span className="pointer-events-none absolute left-3.5 text-zinc-600 transition-colors group-focus-within:text-violet-400">
          {icon}
        </span>
        <input
          id={id}
          className={`w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-violet-500/60 focus:bg-white/8 focus:ring-2 focus:ring-violet-500/20 ${
            trailing ? "pr-12" : "pr-3.5"
          } ${className}`}
          {...props}
        />
        {trailing && <span className="absolute right-2.5">{trailing}</span>}
      </div>
    </div>
  );
}
