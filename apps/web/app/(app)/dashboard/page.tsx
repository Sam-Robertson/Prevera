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

export default function DashboardPage() {
  const [items, setItems] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((p) => p.status === "ACTIVE").length;
    const inactive = items.filter((p) => p.status === "INACTIVE").length;
    return { total, active, inactive };
  }, [items]);

  const recent = useMemo(() => items.slice(0, 6), [items]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/patients?sort=created_desc", {
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

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-neutral-600">Overview of your clinic.</p>
        </div>
        <div className="flex gap-2">
          <Link className="rounded border px-3 py-2 text-sm" href="/patients">
            View patients
          </Link>
          <button className="rounded border px-3 py-2 text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded border p-4">
          <div className="text-sm text-neutral-600">Patients</div>
          <div className="mt-1 text-2xl font-semibold">{loading ? "—" : stats.total}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-neutral-600">Active</div>
          <div className="mt-1 text-2xl font-semibold">{loading ? "—" : stats.active}</div>
        </div>
        <div className="rounded border p-4">
          <div className="text-sm text-neutral-600">Inactive</div>
          <div className="mt-1 text-2xl font-semibold">{loading ? "—" : stats.inactive}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded border">
          <div className="border-b p-4">
            <div className="font-semibold">Recent patients</div>
            <div className="text-sm text-neutral-600">Most recently created.</div>
          </div>

          <div className="divide-y">
            {recent.map((p) => {
              const name = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || p.id;
              return (
                <div key={p.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <Link className="block truncate text-blue-700 underline" href={`/patients/${p.id}`}>
                      {name}
                    </Link>
                    <div className="mt-1 text-xs text-neutral-600">
                      {p.mrn ? `MRN: ${p.mrn}` : ""}{p.mrn && p.lastVisit ? " • " : ""}{p.lastVisit ? `Last visit: ${formatDate(p.lastVisit)}` : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs text-neutral-600">{p.status ?? ""}</div>
                </div>
              );
            })}

            {recent.length === 0 ? (
              <div className="p-4 text-sm text-neutral-600">{loading ? "Loading..." : "No patients yet"}</div>
            ) : null}
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="font-semibold">Quick actions</div>
          <div className="mt-1 text-sm text-neutral-600">Common workflows.</div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            <Link className="rounded border px-3 py-2 text-sm" href="/patients">
              Create a patient
            </Link>
            <Link className="rounded border px-3 py-2 text-sm" href="/patients">
              Search patients
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
