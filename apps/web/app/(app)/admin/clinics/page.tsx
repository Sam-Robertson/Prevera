"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Clinic = {
  id: string;
  name: string;
  createdAt?: string;
};

export default function AdminClinicsPage() {
  const [items, setItems] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");

  const sorted = useMemo(() => items.slice(), [items]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/admin/clinics", { cache: "no-store" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Request failed (${res.status})`);
      const json = JSON.parse(text);
      setItems(Array.isArray(json) ? json : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createClinic() {
    setError(null);
    const n = name.trim();
    if (!n) {
      setError("Clinic name is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/backend/admin/clinics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Create failed (${res.status})`);
      setName("");
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function deleteClinic(id: string) {
    if (!confirm("Delete this clinic? (must be empty)")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/admin/clinics/${id}`, { method: "DELETE" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Delete failed (${res.status})`);
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
          <h1 className="text-2xl font-semibold">Clinics</h1>
          <p className="text-sm text-neutral-600">Platform admin clinic management.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href="/admin/users-access">
            Users & Access
          </Link>
          <button className="rounded border px-3 py-2 text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Create clinic</div>
        <div className="flex gap-2">
          <input className="w-full rounded border px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder="Clinic name" />
          <button className="rounded bg-black px-3 py-2 text-white" onClick={createClinic} disabled={loading}>
            Create
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-neutral-50 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Clinic id</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id} className="border-b">
                <td className="p-3">{c.name}</td>
                <td className="p-3 font-mono text-xs">{c.id}</td>
                <td className="p-3">
                  <div className="flex justify-end">
                    <button className="rounded border px-2 py-1" onClick={() => deleteClinic(c.id)} disabled={loading}>
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {sorted.length === 0 ? (
              <tr>
                <td className="p-6 text-center text-neutral-600" colSpan={3}>
                  {loading ? "Loading..." : "No clinics"}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
