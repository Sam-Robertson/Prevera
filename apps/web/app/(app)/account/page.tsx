"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MeResponse = {
  sub?: string;
  email?: string;
  user?: {
    id?: string;
    email?: string | null;
    clinicId?: string | null;
    cognitoSub?: string | null;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  error?: string;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<MeResponse | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/whoami", { cache: "no-store" });
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        // ignore
      }

      if (!res.ok) {
        const msg = (json && (json.error || json.message)) || text || `Request failed (${res.status})`;
        throw new Error(msg);
      }

      setMe((json ?? {}) as MeResponse);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const displayEmail = me?.email || me?.user?.email || "";

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Account settings</h1>
          <p className="text-sm text-neutral-600">Manage your account and session.</p>
        </div>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-2 text-sm" onClick={load} disabled={loading}>
            Refresh
          </button>
          <Link className="rounded border px-3 py-2 text-sm" href="/api/auth/logout">
            Logout
          </Link>
        </div>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded border p-4">
          <div className="mb-3 font-semibold">Profile</div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-neutral-600">Email</div>
              <div className="break-all">{loading ? "…" : displayEmail || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-600">Cognito sub</div>
              <div className="break-all">{loading ? "…" : me?.sub || me?.user?.cognitoSub || "—"}</div>
            </div>
            <div>
              <div className="text-xs text-neutral-600">User id</div>
              <div className="break-all">{loading ? "…" : me?.user?.id || "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded border p-4">
          <div className="mb-3 font-semibold">Clinic</div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="text-xs text-neutral-600">Clinic id</div>
              <div className="break-all">{loading ? "…" : me?.user?.clinicId || "—"}</div>
            </div>
            <div className="pt-2 text-xs text-neutral-600">
              Clinic settings are not editable yet.
            </div>
          </div>
        </div>
      </div>

      <div className="rounded border p-4">
        <div className="mb-2 font-semibold">Debug</div>
        <div className="text-sm text-neutral-600">Current /me payload:</div>
        <pre className="mt-2 overflow-x-auto rounded bg-neutral-50 p-3 text-xs">
          {loading ? "Loading..." : JSON.stringify(me, null, 2)}
        </pre>
      </div>
    </div>
  );
}
