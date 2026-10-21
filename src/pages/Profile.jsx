import { useState } from "react";
import { KeyRound, LogOut } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Input } from "../components/common/Field";
import { useApp } from "../state/AppContext";
import { changePassword } from "../services/authService";
import { useNavigate } from "react-router-dom";

const emptyPasswords = { current: "", next: "", confirm: "" };

export default function Profile() {
  const { currentUser, signOut, notify } = useApp();
  const navigate = useNavigate();
  const [passwords, setPasswords] = useState(emptyPasswords);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const logout = async () => {
    // Await so the Firestore listeners are torn down before we navigate.
    await signOut();
    navigate("/login", { replace: true });
  };

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
    ? new Date(currentUser.lastLogin).toLocaleString("en-IN", { hour12: false })
    : "—";

  return (
    <div className="grid max-w-lg gap-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">Your account details</p>
      </div>

      <div className="glass-card">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-violet-800 text-2xl font-black text-white shadow-lg shadow-violet-900/40">
            {currentUser.name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-xl font-black text-zinc-100">{currentUser.name}</p>
            <p className="text-sm text-zinc-500">@{currentUser.username}</p>
          </div>
        </div>

        <hr className="my-5 border-white/8" />

        <div className="grid gap-3 text-sm">
          {[
            { label: "Full Name", value: currentUser.name },
            { label: "Username", value: currentUser.username },
            { label: "Role", value: currentUser.role },
            { label: "Signed in", value: lastLogin },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-zinc-500">{label}</span>
              <span className="font-semibold text-zinc-200">{value}</span>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <span className="text-zinc-500">Status</span>
            <Badge>{currentUser.status ?? "ACTIVE"}</Badge>
          </div>
        </div>

        <hr className="my-5 border-white/8" />

        <Button variant="secondary" onClick={logout} className="text-red-400 border-red-500/20 hover:bg-red-500/10 hover:text-red-300">
          <LogOut size={14} /> Sign out
        </Button>
      </div>

      <form onSubmit={submitPassword} className="glass-card grid gap-4">
        <div className="flex items-center gap-2">
          <KeyRound size={16} className="text-violet-300" />
          <h2 className="font-bold text-zinc-100">Change password</h2>
        </div>
        <Input
          label="Current Password"
          type="password"
          autoComplete="current-password"
          required
          value={passwords.current}
          onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
        />
        <Input
          label="New Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={passwords.next}
          onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
        />
        <Input
          label="Confirm New Password"
          type="password"
          autoComplete="new-password"
          required
          value={passwords.confirm}
          onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
        />
        {error && (
          <p role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" variant="violet" disabled={saving}>
            {saving ? "Updating…" : "Update Password"}
          </Button>
        </div>
      </form>
    </div>
  );
}
