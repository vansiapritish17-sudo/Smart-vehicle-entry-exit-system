import { useState } from "react";
import { Copy, KeyRound, Pencil, Plus, Power, Save, X } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import { Input, Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";

const initialForm = { name: "", username: "", role: "Security Operator" };

function formatLogin(value) {
  if (!value || value === "Not logged in") return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("en-IN", { hour12: false });
}

export default function Users() {
  const { users, currentUser, addUser, updateUser, resetUserPassword, toggleUser, notify } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // Shown once after create/reset; the password is not stored anywhere else.
  const [credential, setCredential] = useState(null);

  const isSelf = (row) => row.uid === currentUser?.uid;

  const startEdit = (row) => {
    setEditingId(row.id);
    setForm({ name: row.name, username: row.username, role: row.role });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = editingId
      ? await updateUser(editingId, { name: form.name, role: form.role })
      : await addUser(form);
    setSaving(false);
    if (!result.ok) return;
    if (!editingId && result.data?.temporaryPassword) {
      setCredential({ username: result.data.user.username, password: result.data.temporaryPassword });
    }
    cancelEdit();
  };

  const resetPassword = async (row) => {
    if (!window.confirm(`Reset the password for ${row.username}? They will be signed out everywhere.`)) return;
    setBusyId(row.id);
    const result = await resetUserPassword(row.id);
    setBusyId(null);
    if (result.ok) setCredential({ username: row.username, password: result.data.temporaryPassword });
  };

  const toggle = async (row) => {
    if (row.status === "ACTIVE" && !window.confirm(`Deactivate ${row.username}? They will be signed out immediately.`)) return;
    setBusyId(row.id);
    await toggleUser(row.id);
    setBusyId(null);
  };

  const copyPassword = async () => {
    try {
      await navigator.clipboard.writeText(credential.password);
      notify("Password copied to clipboard.");
    } catch {
      notify("Copy failed — select the password and copy it manually.", "warning");
    }
  };

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-black text-zinc-100">User Management</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage system users and their roles
        </p>
      </div>

      {credential && (
        <div className="glass-card border-lime-400/25">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="font-bold text-lime-300">Temporary password for @{credential.username}</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Share it securely. It is shown only once — the user should change it from their Profile page after signing in.
              </p>
              <p className="mt-3 inline-block select-all rounded-lg bg-white/8 px-3 py-2 font-mono text-base font-bold text-zinc-100">
                {credential.password}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyPassword}><Copy size={14} /> Copy</Button>
              <Button variant="ghost" onClick={() => setCredential(null)} aria-label="Dismiss"><X size={14} /></Button>
            </div>
          </div>
        </div>
      )}

      {/* Add / edit user form */}
      <form onSubmit={submit} className="glass-card">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-bold text-zinc-100">{editingId ? `Edit @${form.username}` : "Add new user"}</h2>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/15">
            {editingId ? <Pencil size={15} className="text-violet-300" /> : <Plus size={16} className="text-violet-300" />}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <Input
            label="Full Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            minLength={2}
            maxLength={80}
          />
          <Input
            label="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })}
            required
            disabled={Boolean(editingId)}
            pattern="[a-z0-9._\-]{3,30}"
            title="3–30 characters: lowercase letters, digits, dot, dash or underscore"
          />
          <Select
            label="Role"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            <option>Administrator</option>
            <option>Security Operator</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={saving}>
              {editingId ? <><Save size={15} /> Save</> : <><Plus size={15} /> Add User</>}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>
            )}
          </div>
        </div>
      </form>

      <Table
        columns={[
          { key: "name", label: "Name" },
          { key: "username", label: "Username" },
          { key: "role", label: "Role" },
          {
            key: "status",
            label: "Status",
            render: (row) => <Badge>{row.status}</Badge>,
          },
          { key: "lastLogin", label: "Last Login", render: (row) => formatLogin(row.lastLogin) },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex flex-wrap gap-1">
                <Button variant="ghost" onClick={() => startEdit(row)}>
                  <Pencil size={13} /> Edit
                </Button>
                <Button variant="ghost" disabled={busyId === row.id} onClick={() => resetPassword(row)}>
                  <KeyRound size={13} /> Reset password
                </Button>
                {!isSelf(row) && (
                  <Button variant="ghost" disabled={busyId === row.id} onClick={() => toggle(row)}>
                    <Power size={13} />{" "}
                    {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        rows={users}
        empty="No users found."
      />
    </div>
  );
}
