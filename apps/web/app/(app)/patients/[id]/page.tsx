"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PatientStatus = "ACTIVE" | "INACTIVE";

type Patient = {
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: string | null;
  phone?: string | null;
  email?: string | null;
  mrn?: string | null;
  lastVisit?: string | null;
  status?: PatientStatus;
};

type Note = {
  id: string;
  title?: string | null;
  body: string;
  createdAt?: string;
  updatedAt?: string;
  createdByUser?: { id: string; email: string } | null;
};

function formatDateTime(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString(undefined, { timeZone: "UTC" });
}

function formatDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { timeZone: "UTC" });
}

export default function PatientDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [editNoteId, setEditNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");

  const patientName = useMemo(() => {
    const n = `${patient?.firstName ?? ""} ${patient?.lastName ?? ""}`.trim();
    return n || id;
  }, [patient?.firstName, patient?.lastName, id]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [pRes, nRes] = await Promise.all([
        fetch(`/api/backend/patients/${id}`, { cache: "no-store" }),
        fetch(`/api/backend/patients/${id}/notes`, { cache: "no-store" }),
      ]);

      if (!pRes.ok) {
        const text = await pRes.text();
        throw new Error(text || `Patient request failed (${pRes.status})`);
      }
      if (!nRes.ok) {
        const text = await nRes.text();
        throw new Error(text || `Notes request failed (${nRes.status})`);
      }

      const pJson = (await pRes.json()) as Patient;
      const nJson = (await nRes.json()) as Note[];

      setPatient(pJson);
      setNotes(Array.isArray(nJson) ? nJson : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function startEditNote(n: Note) {
    setError(null);
    setEditNoteId(n.id);
    setEditTitle((n.title ?? "").trim());
    setEditBody(n.body ?? "");
  }

  function cancelEditNote() {
    setEditNoteId(null);
    setEditTitle("");
    setEditBody("");
  }

  async function saveEditNote(noteId: string) {
    setError(null);

    const body = editBody.trim();
    const title = editTitle.trim();
    if (!body) {
      setError("Note body is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/backend/patients/${id}/notes/${noteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title || null, body }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Update note failed (${res.status})`);
      }

      cancelEditNote();
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function addNote() {
    setError(null);
    const body = newBody.trim();
    const title = newTitle.trim();
    if (!body) {
      setError("Note body is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/backend/patients/${id}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: title || undefined, body }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Create note failed (${res.status})`);
      }

      setNewTitle("");
      setNewBody("");
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
          <h1 className="text-2xl font-semibold">{patientName}</h1>
          <p className="text-sm text-neutral-600">Patient details and notes.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href="/patients">
            Back
          </Link>
          <button className="rounded border px-3 py-2 text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Add note</div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Title (optional)</div>
            <input className="w-full rounded border px-3 py-2 text-sm" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs text-neutral-600">Note</div>
            <textarea className="h-28 w-full rounded border px-3 py-2 text-sm" value={newBody} onChange={(e) => setNewBody(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <button className="rounded bg-black px-3 py-2 text-sm text-white" onClick={addNote} disabled={loading}>
              Save note
            </button>
          </div>
        </div>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Patient</div>
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <div>
            <div className="text-xs text-neutral-600">DOB</div>
            <div>{formatDate(patient?.dob ?? null) || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-600">Last visit</div>
            <div>{formatDate(patient?.lastVisit ?? null) || "—"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-600">Phone</div>
            <div>{patient?.phone ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-600">Email</div>
            <div className="break-all">{patient?.email ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-600">MRN</div>
            <div>{patient?.mrn ?? "—"}</div>
          </div>
          <div>
            <div className="text-xs text-neutral-600">Status</div>
            <div>{patient?.status ?? "—"}</div>
          </div>
        </div>
      </div>

      <div className="rounded border">
        <div className="border-b p-4">
          <div className="font-semibold">Notes</div>
          <div className="text-sm text-neutral-600">Clinical notes for this patient.</div>
        </div>

        <div className="divide-y">
          {notes.map((n) => {
            const isEditing = editNoteId === n.id;
            return (
              <div key={n.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Title (optional)"
                        />
                        <textarea
                          className="h-28 w-full rounded border px-3 py-2 text-sm"
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                        />
                        <div className="flex justify-end gap-2">
                          <button className="rounded border px-3 py-2 text-sm" onClick={cancelEditNote} disabled={loading}>
                            Cancel
                          </button>
                          <button
                            className="rounded bg-black px-3 py-2 text-sm text-white"
                            onClick={() => saveEditNote(n.id)}
                            disabled={loading}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{(n.title ?? "").trim() || "Note"}</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-neutral-800">{n.body}</div>
                      </>
                    )}
                  </div>

                  <div className="shrink-0 text-right text-xs text-neutral-600">
                    <div>{formatDateTime(n.createdAt ?? null)}</div>
                    <div>{n.createdByUser?.email ?? ""}</div>
                    {!isEditing ? (
                      <div className="mt-2">
                        <button className="rounded border px-2 py-1 text-xs" onClick={() => startEditNote(n)} disabled={loading}>
                          Edit
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {notes.length === 0 ? (
            <div className="p-4 text-sm text-neutral-600">{loading ? "Loading..." : "No notes yet"}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
