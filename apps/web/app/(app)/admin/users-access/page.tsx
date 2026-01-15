"use client";

import { useEffect, useMemo, useState } from "react";

type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

type Invite = {
  id: string;
  email: string;
  role: string;
  status: InviteStatus;
  createdAt?: string;
  expiresAt?: string;
  lastSentAt?: string | null;
  sendCount?: number;
};

type User = {
  id: string;
  email: string;
  role: string;
  isActive: boolean;
  lastActiveAt?: string | null;
};

function formatDateTime(v?: string | null) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function UsersAccessPage() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"OWNER" | "ADMIN" | "STAFF">("STAFF");

  const pendingInvites = useMemo(() => invites.filter((i) => i.status === "PENDING"), [invites]);
  const activeUsers = useMemo(() => users.filter((u) => u.isActive), [users]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [invRes, userRes] = await Promise.all([
        fetch("/api/backend/invites", { cache: "no-store" }),
        fetch("/api/backend/admin/users", { cache: "no-store" }),
      ]);

      if (!invRes.ok) throw new Error((await invRes.text()) || `Invites failed (${invRes.status})`);
      if (!userRes.ok) throw new Error((await userRes.text()) || `Users failed (${userRes.status})`);

      const invJson = await invRes.json();
      const userJson = await userRes.json();

      setInvites(Array.isArray(invJson) ? invJson : []);
      setUsers(Array.isArray(userJson) ? userJson : []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createInvite() {
    setError(null);
    const email = inviteEmail.trim();
    if (!email) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/backend/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Invite failed (${res.status})`);

      setInviteEmail("");
      setInviteRole("STAFF");

      try {
        const json = JSON.parse(text);
        if (json?.inviteUrl) {
          await navigator.clipboard.writeText(String(json.inviteUrl));
        }
      } catch {
        // ignore
      }

      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function resendInvite(id: string) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/invites/${id}/resend`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Resend failed (${res.status})`);

      try {
        const json = JSON.parse(text);
        if (json?.inviteUrl) {
          await navigator.clipboard.writeText(String(json.inviteUrl));
        }
      } catch {
        // ignore
      }

      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvite(id: string) {
    if (!confirm("Revoke this invite?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/invites/${id}/revoke`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Revoke failed (${res.status})`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Remove this user?")) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/backend/admin/users/${id}/remove`, { method: "POST" });
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Remove failed (${res.status})`);
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
          <h1 className="text-2xl font-semibold">Users & Access</h1>
          <p className="text-sm text-neutral-600">Invite users, manage access, and view activity.</p>
        </div>
        <button className="rounded border px-3 py-2 text-sm" onClick={load} disabled={loading}>
          Refresh
        </button>
      </div>

      {error ? <div className="rounded border border-red-200 bg-red-50 p-3 text-sm">{error}</div> : null}

      <div className="rounded border p-4">
        <div className="mb-3 font-semibold">Invite user</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-7">
          <div className="md:col-span-4">
            <div className="text-xs text-neutral-600">Email</div>
            <input className="w-full rounded border px-3 py-2" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <div className="text-xs text-neutral-600">Role</div>
            <select className="w-full rounded border px-3 py-2" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="w-full rounded bg-black px-3 py-2 text-white" onClick={createInvite} disabled={loading}>
              Invite
            </button>
          </div>
        </div>
        <div className="mt-2 text-xs text-neutral-600">
          After inviting, the invite link is copied to clipboard (and emailed via SES if configured).
        </div>
      </div>

      <div className="rounded border">
        <div className="border-b p-4">
          <div className="font-semibold">Pending invites</div>
          <div className="text-sm text-neutral-600">Invites awaiting acceptance.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-neutral-50 text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Created</th>
                <th className="p-3">Expires</th>
                <th className="p-3">Sent</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {pendingInvites.map((i) => (
                <tr key={i.id} className="border-b">
                  <td className="p-3">{i.email}</td>
                  <td className="p-3">{i.role}</td>
                  <td className="p-3">{formatDateTime(i.createdAt)}</td>
                  <td className="p-3">{formatDateTime(i.expiresAt)}</td>
                  <td className="p-3">{i.sendCount ?? 0}</td>
                  <td className="p-3">
                    <div className="flex justify-end gap-2">
                      <button className="rounded border px-2 py-1" onClick={() => resendInvite(i.id)} disabled={loading}>
                        Resend
                      </button>
                      <button className="rounded border px-2 py-1" onClick={() => revokeInvite(i.id)} disabled={loading}>
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {pendingInvites.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-neutral-600" colSpan={6}>
                    {loading ? "Loading..." : "No pending invites"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded border">
        <div className="border-b p-4">
          <div className="font-semibold">Active users</div>
          <div className="text-sm text-neutral-600">Users with access to this clinic.</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b bg-neutral-50 text-left">
                <th className="p-3">Email</th>
                <th className="p-3">Role</th>
                <th className="p-3">Last active</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((u) => (
                <tr key={u.id} className="border-b">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">{formatDateTime(u.lastActiveAt)}</td>
                  <td className="p-3">
                    <div className="flex justify-end">
                      <button className="rounded border px-2 py-1" onClick={() => removeUser(u.id)} disabled={loading}>
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {activeUsers.length === 0 ? (
                <tr>
                  <td className="p-6 text-center text-neutral-600" colSpan={4}>
                    {loading ? "Loading..." : "No users"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
