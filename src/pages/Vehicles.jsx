import { useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Plus, Power, Save, Trash2, X } from "lucide-react";
import PageHeader, { Plate, SectionTitle } from "../components/common/PageHeader";
import Badge from "../components/common/Badge";
import Button from "../components/common/Button";
import ConfirmDialog from "../components/common/ConfirmDialog";
import { Input, Select } from "../components/common/Field";
import Table from "../components/common/Table";
import { useApp } from "../state/AppContext";

const VEHICLE_TYPES = ["Car", "Bike", "Scooter", "SUV", "Van", "Truck", "Bus"];

const initialForm = {
  regNo: "",
  owner: "",
  contact: "",
  type: "Car",
  model: "",
  color: "",
  registrationStatus: "ACTIVE",
};

export default function Vehicles() {
  const { vehicles, addVehicle, updateVehicle, toggleVehicle, deleteVehicle, loading } = useApp();
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const startEdit = (vehicle) => {
    setEditingId(vehicle.id);
    setForm({ ...initialForm, ...vehicle });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      regNo: form.regNo,
      owner: form.owner,
      contact: form.contact,
      type: form.type,
      model: form.model,
      color: form.color,
      registrationStatus: form.registrationStatus,
    };
    const result = editingId ? await updateVehicle(editingId, payload) : await addVehicle(payload);
    setSaving(false);
    // Keep what was typed on failure so the user can correct it.
    if (result.ok) cancelEdit();
  };

  const toggle = async (id) => {
    setBusyId(id);
    await toggleVehicle(id);
    setBusyId(null);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    const result = await deleteVehicle(pendingDelete.id);
    setDeleting(false);
    if (!result.ok) return;
    if (editingId === pendingDelete.id) cancelEdit();
    setPendingDelete(null);
  };

  // A vehicle inside can't be deleted: the server refuses, so say why up front.
  const deleteBlocked = (vehicle) => vehicle.currentStatus === "INSIDE";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Register"
        title="Vehicles"
        description="Register vehicles, keep their details current, and control who the gates admit."
      />

      {/* Add / edit vehicle form */}
      <form onSubmit={submit} className="glass-card">
        <SectionTitle className="mb-5">
          {editingId ? <>Editing <span className="text-zinc-200">{form.regNo}</span></> : "Register a vehicle"}
        </SectionTitle>
        <div className="grid gap-4 md:grid-cols-3">
          <Input
            label="Registration number"
            className="font-mono tracking-wider"
            value={form.regNo}
            onChange={(e) => setForm({ ...form, regNo: e.target.value.toUpperCase() })}
            required
            maxLength={13}
            placeholder="e.g. MH12AB1234"
          />
          <Input label="Owner" value={form.owner} onChange={set("owner")} required minLength={2} maxLength={80} />
          <Input
            label="Contact"
            type="tel"
            value={form.contact}
            onChange={set("contact")}
            required
            pattern="\+?[0-9 \-]{10,16}"
            title="10–13 digit phone number"
            placeholder="e.g. 9876543210"
          />
          <Select label="Type" value={form.type} onChange={set("type")}>
            {VEHICLE_TYPES.map((type) => <option key={type}>{type}</option>)}
          </Select>
          <Input label="Model" value={form.model} onChange={set("model")} maxLength={60} />
          <Input label="Color" value={form.color} onChange={set("color")} maxLength={30} />
          <Select label="Registration" value={form.registrationStatus} onChange={set("registrationStatus")}>
            <option value="ACTIVE">Active — admitted at the gate</option>
            <option value="INACTIVE">Inactive — refused at the gate</option>
          </Select>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={saving}>
            {editingId ? <><Save size={15} /> Save changes</> : <><Plus size={15} /> Register vehicle</>}
          </Button>
          {editingId && (
            <Button type="button" variant="secondary" onClick={cancelEdit}>
              <X size={15} /> Cancel
            </Button>
          )}
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              className="ml-auto hover:!bg-red-500/10 hover:!text-red-300"
              disabled={deleteBlocked(form)}
              title={deleteBlocked(form) ? "Record this vehicle's exit before deleting it" : undefined}
              onClick={() => setPendingDelete(form)}
            >
              <Trash2 size={15} /> Delete vehicle
            </Button>
          )}
        </div>
      </form>

      <section className="grid gap-3">
      <SectionTitle>Registered · {vehicles.length}</SectionTitle>
      <Table
        loading={loading}
        columns={[
          {
            key: "regNo",
            label: "Vehicle",
            render: (row) => (
              <Link to={`/vehicles/${row.id}`} className="hover:underline">
                <Plate>{row.regNo}</Plate>
              </Link>
            ),
          },
          { key: "owner", label: "Owner" },
          { key: "contact", label: "Contact" },
          { key: "type", label: "Type" },
          { key: "model", label: "Model" },
          { key: "color", label: "Color" },
          {
            key: "registrationStatus",
            label: "Registration",
            render: (row) => <Badge>{row.registrationStatus}</Badge>,
          },
          {
            key: "currentStatus",
            label: "Location",
            render: (row) => <Badge>{row.currentStatus}</Badge>,
          },
          {
            key: "actions",
            label: "",
            render: (row) => (
              <div className="flex justify-end gap-0.5">
                <Link
                  to={`/vehicles/${row.id}`}
                  title="View details"
                  aria-label={`View ${row.regNo}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100"
                >
                  <Eye size={13} />
                </Link>
                <Button variant="ghost" size="sm" className="w-8 px-0" title="Edit" aria-label={`Edit ${row.regNo}`} onClick={() => startEdit(row)}>
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  title={row.registrationStatus === "ACTIVE" ? "Deactivate" : "Activate"}
                  aria-label={`${row.registrationStatus === "ACTIVE" ? "Deactivate" : "Activate"} ${row.regNo}`}
                  disabled={busyId === row.id}
                  onClick={() => toggle(row.id)}
                  size="sm"
                  className={`w-8 px-0 ${row.registrationStatus === "ACTIVE" ? "hover:text-red-400" : "hover:text-lime-400"}`}
                >
                  <Power size={13} />
                </Button>
                <span aria-hidden className="mx-1 my-2 w-px bg-white/10" />
                <Button
                  variant="ghost"
                  title={deleteBlocked(row) ? "Inside — record its exit before deleting" : "Delete"}
                  aria-label={`Delete ${row.regNo}`}
                  disabled={deleteBlocked(row)}
                  onClick={() => setPendingDelete(row)}
                  size="sm"
                  className="w-8 px-0 hover:!bg-red-500/10 hover:!text-red-400"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ),
          },
        ]}
        rows={vehicles}
        empty="No vehicles registered yet. Register the first one above."
      />
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${pendingDelete?.regNo ?? "vehicle"}?`}
        confirmLabel="Delete vehicle"
        busyLabel="Deleting…"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        <p>
          This removes the vehicle{pendingDelete?.owner ? ` owned by ${pendingDelete.owner}` : ""} from the register.
          It will no longer be admitted at the gate.
        </p>
        <p className="mt-2 text-zinc-500">
          Its past movements and alerts stay in History. This can't be undone. To block it temporarily, deactivate it instead.
        </p>
      </ConfirmDialog>
    </div>
  );
}
