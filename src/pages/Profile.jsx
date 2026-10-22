import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, LogOut } from "lucide-react";
import Badge from "../components/common/Badge";
import { useApp } from "../state/AppContext";
import { changePassword } from "../services/authService";

const emptyPasswords = { current: "", next: "", confirm: "" };

export default function Profile() {
  const { currentUser, signOut, notify } = useApp();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const isAdmin = currentUser.role === "Administrator";

  const logout = async () => {
    // Await so the Firestore listeners are torn down before we navigate.
    await signOut();
    navigate("/login", { replace: true });
  };

  const setPassword = (field) => (e) => setPasswords({ ...passwords, [field]: e.target.value });

  const submitPassword = async (e) => {
    e.preventDefault();
    setError("");
    if (passwords.next.length < 8) return setError("New password must be at least 8 characters.");
    if (passwords.next !== passwords.confirm) return setError("New passwords do not match.");
    if (passwords.next === passwords.current) return setError("Choose a password different from the current one.");

    setSaving(true);
    const result = await changePassword(passwords.current, passwords.next);
    setSaving(false);
    if (!result.ok) return setError(result.message);
    setPasswords(emptyPasswords);
    notify("Password changed.");
  };

  const lastLogin = currentUser.lastLogin && !Number.isNaN(new Date(currentUser.lastLogin).getTime())
    ? new Date(currentUser.lastLogin).toLocaleString("en-IN", { hour12: false, dateStyle: "medium", timeStyle: "short" })
    : "—";

  // Live hint under the confirm field, so a mismatch shows before submitting.
  const mismatch = passwords.confirm && passwords.next !== passwords.confirm;

  return (
    <div className="grid gap-6">
      {/* ── Page header ── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-violet-400">Account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">Profile</h1>
        </div>
        <button
          type="button"
          onClick={logout}
          className="flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3.5 text-sm font-medium text-zinc-400 transition hover:border-red-500/30 hover:bg-red-500/[0.07] hover:text-red-300"
        >
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        {/* ── Identity ── */}
        <section className="glass-card">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-violet-800 text-base font-bold text-white">
              {currentUser.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-zinc-100">{currentUser.name}</p>
              <p className="truncate font-mono text-xs text-zinc-500">@{currentUser.username}</p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-white/[0.06] border-t border-white/[0.06] text-sm">
            <Row label="Role" value={currentUser.role ?? "—"} />
            <Row label="Status" value={<Badge>{currentUser.status ?? "ACTIVE"}</Badge>} />
            <Row label="Signed in" value={<span className="font-mono text-[13px] tabular-nums">{lastLogin}</span>} />
          </dl>

          <p className="mt-4 text-xs leading-relaxed text-zinc-500">
            {isAdmin ? (
              <>
                Name and role are managed in{" "}
                <Link to="/users" className="text-zinc-300 underline decoration-white/20 underline-offset-2 hover:decoration-zinc-300">
                  User Management
                </Link>
                .
              </>
            ) : (
              "Name and role are managed by an administrator."
            )}
          </p>
        </section>

        {/* ── Change password ── */}
        <form onSubmit={submitPassword} className="glass-card p-0!">
          <div className="grid gap-5 p-5 sm:p-6">
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">Change password</h2>
              <p className="mt-2 text-sm text-zinc-400">
                You'll stay signed in on this device. Use at least 8 characters.
              </p>
            </div>

            <PasswordField
              id="pw-current"
              label="Current password"
              autoComplete="current-password"
              value={passwords.current}
              onChange={setPassword("current")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <PasswordField
                id="pw-next"
                label="New password"
                autoComplete="new-password"
                minLength={8}
                value={passwords.next}
                onChange={setPassword("next")}
              />
              <PasswordField
                id="pw-confirm"
                label="Confirm new password"
                autoComplete="new-password"
                value={passwords.confirm}
                onChange={setPassword("confirm")}
                invalid={mismatch}
                hint={mismatch ? "Doesn't match the new password" : null}
              />
            </div>

            {error && (
              <p role="alert" className="animate-fade-up border-l-2 border-red-500 bg-red-500/[0.07] px-3.5 py-2.5 text-sm text-red-300">
                {error}
              </p>
            )}
          </div>

          <div className="flex justify-end border-t border-white/[0.06] px-5 py-4 sm:px-6">
            <button
              type="submit"
              disabled={saving}
              className="group flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-100 px-5 text-sm font-semibold text-zinc-950 transition hover:bg-lime-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-zinc-100"
            >
              {saving ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-950/20 border-t-zinc-950" />
                  Updating…
                </>
              ) : (
                <>
                  Update password
                  <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-right font-medium text-zinc-200">{value}</dd>
    </div>
  );
}

function PasswordField({ id, label, invalid = false, hint, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-[13px] font-medium text-zinc-400">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type={shown ? "text" : "password"}
          required
          aria-invalid={invalid || undefined}
          className={`h-11 w-full rounded-lg border bg-[var(--bg)] pl-3.5 pr-12 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 hover:border-white/20 focus:ring-[3px] ${
            invalid
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              : "border-white/10 focus:border-violet-500 focus:ring-violet-500/20"
          }`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShown((v) => !v)}
          aria-label={shown ? "Hide password" : "Show password"}
          className="absolute right-1.5 grid h-8 w-8 place-items-center rounded-md text-zinc-500 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40"
        >
          {shown ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {hint && <p className="text-xs text-red-300/90">{hint}</p>}
    </div>
  );
}
