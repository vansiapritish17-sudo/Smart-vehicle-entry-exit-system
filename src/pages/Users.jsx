import { useState } from "react";
import { Copy, KeyRound, Pencil, Plus, Power, Save, X } from "lucide-react";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Input, Select } from "../components/common/Field";
import PageHeader, { SectionTitle } from "../components/common/PageHeader";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";

const initialForm = { name: "", username: "", role: "Security Operator" };

function formatLogin(value) {
  if (!value || value === "Not logged in") return "Never";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString("en-IN", { hour12: false, dateStyle: "medium", timeStyle: "short" });
}

export default function Users() {
  const { users, currentUser, addUser, updateUser, resetUserPassword, toggleUser, notify } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  // Shown once after create/reset; the password is not stored anywhere else.
  const [credential, setCredential] = useState(null);
  // { kind: "reset" | "deactivate", user } while a confirmation is open.
  const [pending, setPending] = useState(null);

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

  const toggle = async (row) => {
    if (row.status === "ACTIVE") return setPending({ kind: "deactivate", user: row });
    setBusyId(row.id);
    await toggleUser(row.id);
    setBusyId(null);
  };

  const confirmPending = async () => {
    const { kind, user } = pending;
    setBusyId(user.id);
    if (kind === "reset") {
      const result = await resetUserPassword(user.id);
      if (result.ok) setCredential({ username: user.username, password: result.data.temporaryPassword });
    } else {
      await toggleUser(user.id);
    }
    setBusyId(null);
    setPending(null);
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
      <PageHeader
        eyebrow="Administration"
        title="Users"
        description="Who can sign in, and whether they run the gates or the whole system."
      />

      {credential && (
        <div className="animate-fade-up glass-card !border-l-2 !border-l-lime-300">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <SectionTitle>Temporary password · @{credential.username}</SectionTitle>
              <p className="mt-3 inline-block select-all rounded-lg border border-white/10 bg-[var(--bg)] px-3 py-2 font-mono text-base font-semibold tracking-wider text-zinc-100">
                {credential.password}
              </p>
              <p className="mt-3 max-w-lg text-xs leading-relaxed text-zinc-500">
                Shown only once. Share it securely; they should change it from their Profile after signing in.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={copyPassword}>
                <Copy size={14} /> Copy
              </Button>
              <Button variant="ghost" className="w-9 px-0" onClick={() => setCredential(null)} aria-label="Dismiss">
                <X size={14} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={submit} className="glass-card">
        <SectionTitle className="mb-5">
          {editingId ? <>Editing <span className="text-zinc-200">@{form.username}</span></> : "Add a user"}
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
          <Input
            label="Full name"
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
          <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option>Administrator</option>
            <option>Security Operator</option>
          </Select>
          <div className="flex items-end gap-2">
            <Button type="submit" disabled={saving} className="h-10">
              {editingId ? <><Save size={15} /> Save</> : <><Plus size={15} /> Add user</>}
            </Button>
            {editingId && (
              <Button type="button" variant="secondary" className="h-10" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </form>

      <section className="grid gap-3">
        <SectionTitle>Accounts · {users.length}</SectionTitle>
        <Table
          columns={[
            {
              key: "name",
              label: "Name",
              render: (row) => (
                <div>
                  <p className="font-medium text-zinc-100">
                    {row.name}
                    {isSelf(row) && <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span>}
                  </p>
                  <p className="font-mono text-xs text-zinc-500">@{row.username}</p>
                </div>
              ),
            },
            { key: "role", label: "Role" },
            { key: "status", label: "Status", render: (row) => <Badge>{row.status}</Badge> },
            {
              key: "lastLogin",
              label: "Last sign-in",
              render: (row) => <span className="font-mono text-xs text-zinc-400">{formatLogin(row.lastLogin)}</span>,
            },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex justify-end gap-0.5">
                  <Button size="sm" variant="ghost" onClick={() => startEdit(row)}>
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busyId === row.id}
                    onClick={() => setPending({ kind: "reset", user: row })}
                  >
                    <KeyRound size={13} /> Reset password
                  </Button>
                  {!isSelf(row) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busyId === row.id}
                      onClick={() => toggle(row)}
                      className={row.status === "ACTIVE" ? "hover:!text-red-400" : "hover:!text-lime-400"}
                    >
                      <Power size={13} /> {row.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
          rows={users}
          empty="No users found."
        />
      </section>

      <ConfirmDialog
        open={Boolean(pending)}
        title={
          pending?.kind === "reset"
            ? `Reset the password for @${pending.user.username}?`
            : `Deactivate @${pending?.user.username}?`
        }
        confirmLabel={pending?.kind === "reset" ? "Reset password" : "Deactivate"}
        busyLabel={pending?.kind === "reset" ? "Resetting…" : "Deactivating…"}
        busy={Boolean(pending) && busyId === pending.user.id}
        onConfirm={confirmPending}
        onCancel={() => setPending(null)}
      >
        {pending?.kind === "reset"
          ? "A new temporary password is issued and they are signed out on every device. Their current password stops working."
          : "They are signed out immediately and can't sign in until an administrator activates the account again. Their records are kept."}
      </ConfirmDialog>
    </div>
  );
}
