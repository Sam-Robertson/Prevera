"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PatientStatus = "ACTIVE" | "INACTIVE";

type PatientListItem = {
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  mrn?: string | null;
  lastVisit?: string | null;
  status?: PatientStatus;
  createdAt?: string;
  updatedAt?: string;
};

function formatDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export default function PatientsPage() {
  const [items, setItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | PatientStatus>("");
  const [sort, setSort] = useState<"created_desc" | "name_asc">("created_desc");

  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createDob, setCreateDob] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createMrn, setCreateMrn] = useState("");
  const [createLastVisit, setCreateLastVisit] = useState("");
  const [createStatus, setCreateStatus] = useState<PatientStatus>("ACTIVE");

  const [editId, setEditId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editMrn, setEditMrn] = useState("");
  const [editLastVisit, setEditLastVisit] = useState("");
  const [editStatus, setEditStatus] = useState<PatientStatus>("ACTIVE");

  const [editNoteTitle, setEditNoteTitle] = useState("");
  const [editNoteBody, setEditNoteBody] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    return params.toString();
  }, [q, status, sort]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/backend/patients?${queryString}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
      }

      const json = await res.json();
      const nextItems: PatientListItem[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
          ? json.items
          : [];

      setItems(nextItems);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function maybeCreateNoteAfterSave(id: string) {
    const body = editNoteBody.trim();
    const title = editNoteTitle.trim();
    if (!body) return;

    const res = await fetch(`/api/backend/patients/${id}/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: title || undefined, body }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Create note failed (${res.status})`);
    }

    setEditNoteTitle("");
    setEditNoteBody("");
  }

  useEffect(() => {
    load();
  }, [queryString]);

  async function createPatient() {
    setError(null);
    const firstName = createFirstName.trim();
    const lastName = createLastName.trim();

    if (!firstName || !lastName) {
      setError("First name and last name are required");
      return;
    }

    const body: any = { firstName, lastName, status: createStatus };
    if (createDob.trim()) body.dob = createDob.trim();
    if (createPhone.trim()) body.phone = createPhone.trim();
    if (createEmail.trim()) body.email = createEmail.trim();
    if (createMrn.trim()) body.mrn = createMrn.trim();
    if (createLastVisit.trim()) body.lastVisit = createLastVisit.trim();

    setLoading(true);
    try {
      const res = await fetch("/api/backend/patients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create failed (${res.status})`);
      }

      setCreateFirstName("");
      setCreateLastName("");
      setCreateDob("");
      setCreatePhone("");
      setCreateEmail("");
      setCreateMrn("");
      setCreateLastVisit("");
      setCreateStatus("ACTIVE");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: PatientListItem) {
    setEditId(p.id);
    setEditOpen(true);
    setError(null);
    setEditFirstName((p.firstName ?? "").trim());
    setEditLastName((p.lastName ?? "").trim());
    setEditDob(p.dob ? String(p.dob).slice(0, 10) : "");
    setEditPhone((p.phone ?? "").trim());
    setEditEmail((p.email ?? "").trim());
    setEditMrn((p.mrn ?? "").trim());
    setEditLastVisit(p.lastVisit ? String(p.lastVisit).slice(0, 10) : "");
    setEditStatus((p.status as PatientStatus) ?? "ACTIVE");
    setEditNoteTitle("");
    setEditNoteBody("");
  }

  function cancelEdit() {
    setEditId(null);
    setEditOpen(false);
    setEditFirstName("");
    setEditLastName("");
    setEditDob("");
    setEditPhone("");
    setEditEmail("");
    setEditMrn("");
    setEditLastVisit("");
    setEditStatus("ACTIVE");
    setEditNoteTitle("");
    setEditNoteBody("");
  }

  async function addEditNote() {
    if (!editId) return;
    setError(null);

    const title = editNoteTitle.trim();
    const body = editNoteBody.trim();
    if (!body) {
      setError("Note body is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/backend/patients/${editId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title || undefined, body }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create note failed (${res.status})`);
      }

      setEditNoteTitle("");
      setEditNoteBody("");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit() {
    if (!editId) return;
    setError(null);

    const body: any = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      status: editStatus,
    };
    body.dob = editDob.trim() ? editDob.trim() : null;
    body.phone = editPhone.trim() ? editPhone.trim() : null;
    body.email = editEmail.trim() ? editEmail.trim() : null;
    body.mrn = editMrn.trim() ? editMrn.trim() : null;
    body.lastVisit = editLastVisit.trim() ? editLastVisit.trim() : null;

    setLoading(true);
    try {
      const res = await fetch(`/api/backend/patients/${editId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update failed (${res.status})`);
      }

      try {
        const updated = (await res.json()) as PatientListItem;
        setItems((prev) => prev.map((p) => (p.id === editId ? { ...p, ...updated } : p)));
      } catch {
        // ignore non-json response
      }

      await maybeCreateNoteAfterSave(editId);

      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deletePatient(id: string) {
    if (!confirm("Delete this patient?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/patients/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Delete failed (${res.status})`);
      }
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Patients</h1>
          <p className="text-sm text-neutral-600">Create, edit, and manage your patients.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="space-y-1">
          <label className="text-sm">Search</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Status</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm">Sort</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            <option value="created_desc">Newest</option>
            <option value="name_asc">Name (A-Z)</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            className="w-full rounded border px-3 py-2"
            onClick={() => load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Create patient</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-9">
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">First name</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={createFirstName}
              onChange={(e) => setCreateFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Last name</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={createLastName}
              onChange={(e) => setCreateLastName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">DOB</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="date"
              value={createDob}
              onChange={(e) => setCreateDob(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Phone</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Email</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">MRN</div>
            <input
              className="w-full rounded border px-3 py-2"
              value={createMrn}
              onChange={(e) => setCreateMrn(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Last visit</div>
            <input
              className="w-full rounded border px-3 py-2"
              type="date"
              value={createLastVisit}
              onChange={(e) => setCreateLastVisit(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Status</div>
            <select
              className="w-full rounded border px-3 py-2"
              value={createStatus}
              onChange={(e) => setCreateStatus(e.target.value as PatientStatus)}
            >
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <button
            className="rounded bg-black px-3 py-2 text-white"
            onClick={createPatient}
            disabled={loading}
          >
            Create
          </button>
        </div>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      {editOpen && editId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-semibold">Edit patient</div>
              <button className="rounded border px-2 py-1" onClick={cancelEdit} disabled={loading}>
                Close
              </button>
            </div>

            {error ? <div className="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">First name</div>
                <input className="w-full rounded border px-3 py-2" value={editFirstName} onChange={(e) => setEditFirstName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">Last name</div>
                <input className="w-full rounded border px-3 py-2" value={editLastName} onChange={(e) => setEditLastName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">DOB</div>
                <input className="w-full rounded border px-3 py-2" type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">Last visit</div>
                <input
                  className="w-full rounded border px-3 py-2"
                  type="date"
                  value={editLastVisit}
                  onChange={(e) => setEditLastVisit(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">Phone</div>
                <input className="w-full rounded border px-3 py-2" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">Email</div>
                <input className="w-full rounded border px-3 py-2" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">MRN</div>
                <input className="w-full rounded border px-3 py-2" value={editMrn} onChange={(e) => setEditMrn(e.target.value)} />
              </div>
              <div className="space-y-1">
                <div className="text-xs text-neutral-600">Status</div>
                <select
                  className="w-full rounded border px-3 py-2"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as PatientStatus)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>

            <div className="mt-4 rounded border p-3">
              <div className="mb-2 font-semibold">Add note</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <div className="text-xs text-neutral-600">Title (optional)</div>
                  <input className="w-full rounded border px-3 py-2" value={editNoteTitle} onChange={(e) => setEditNoteTitle(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <div className="text-xs text-neutral-600">Note</div>
                  <textarea className="h-24 w-full rounded border px-3 py-2" value={editNoteBody} onChange={(e) => setEditNoteBody(e.target.value)} />
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button className="rounded border px-3 py-2" onClick={addEditNote} disabled={loading}>
                  Add note
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded border px-3 py-2" onClick={cancelEdit} disabled={loading}>
                Cancel
              </button>
              <button className="rounded bg-black px-3 py-2 text-white" onClick={saveEdit} disabled={loading}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">DOB</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Email</th>
              <th className="p-3">MRN</th>
              <th className="p-3">Last visit</th>
              <th className="p-3">Status</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;

              return (
                <tr key={p.id} className="border-b">
                  <td className="p-3">
                    <Link className="text-blue-700 underline" href={`/patients/${p.id}`}>
                      {name}
                    </Link>
                  </td>
                  <td className="p-3">
                    {formatDate(p.dob)}
                  </td>
                  <td className="p-3">
                    {p.phone ?? ""}
                  </td>
                  <td className="p-3">
                    {p.email ?? ""}
                  </td>
                  <td className="p-3">
                    {p.mrn ?? ""}
                  </td>
                  <td className="p-3">
                    {formatDate(p.lastVisit)}
                  </td>
                  <td className="p-3">
                    {p.status ?? ""}
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded border px-2 py-1" onClick={() => startEdit(p)} disabled={loading}>
                        Edit
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => deletePatient(p.id)} disabled={loading}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {items.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-neutral-600" colSpan={8}>
                  {loading ? "Loading..." : "No patients found"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
