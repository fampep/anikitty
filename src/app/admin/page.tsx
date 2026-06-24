"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Container from "@/components/container";
import { RoleBadge } from "@/components/role-badge";
import {
  Search, Plus, Trash2, Loader2, ShieldCheck, Users, Tag,
  Check, X, Pencil, LogOut, Lock, Eye, EyeOff,
} from "lucide-react";
import { toast } from "sonner";

const ADMIN_TOKEN_KEY = "adminToken";

function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function adminHeaders(): Record<string, string> {
  const token = getAdminToken();
  return { "X-Admin-Token": token ?? "", "Content-Type": "application/json" };
}

// ─────────────────────────────────────────────────────────────────────────────
// Login screen
// ─────────────────────────────────────────────────────────────────────────────
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError("Incorrect password.");
        return;
      }
      const { token } = await res.json();
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      onSuccess();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-white/50" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admin Access</h1>
          <p className="text-sm text-white/35 text-center">This area is restricted. Enter the admin passphrase to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin passphrase"
              autoFocus
              className="w-full bg-white/[0.04] border border-white/12 rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400/80 font-mono px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enter
          </button>
        </form>

        <p className="text-center text-[10px] font-mono text-white/15 mt-6">
          Session expires when tab is closed
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

const BUILTIN_ROLES = [
  { id: "__admin", name: "admin", color: "#ff4d6d" },
  { id: "__mod", name: "moderator", color: "#4d9fff" },
  { id: "__user", name: "user", color: "#888888" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Admin panel
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"users" | "roles">("users");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole] = useState<string | null>(null);

  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#a855f7");
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  const fetchUsers = useCallback(async (q?: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch { toast.error("Failed to load users"); }
    finally { setUsersLoading(false); }
  }, [onLogout]);

  const fetchRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const res = await fetch("/api/admin/roles", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      const data = await res.json();
      setRoles(data.roles ?? []);
    } catch { toast.error("Failed to load roles"); }
    finally { setRolesLoading(false); }
  }, [onLogout]);

  useEffect(() => { fetchUsers(); fetchRoles(); }, [fetchUsers, fetchRoles]);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = (v: string) => {
    setSearch(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchUsers(v), 350);
  };

  const allRoleOptions = [
    ...BUILTIN_ROLES,
    ...roles.filter((r) => !["admin", "moderator", "user"].includes(r.name)),
  ];

  const handleRoleChange = async (userId: string, role: string) => {
    setSavingRole(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ userId, role }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role } : u)));
      setPendingRole((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      toast.success(`Role updated to "${role}"`);
    } catch { toast.error("Failed to update role"); }
    finally { setSavingRole(null); }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({ name: newRoleName.trim(), color: newRoleColor }),
      });
      if (!res.ok) throw new Error();
      const role = await res.json();
      setRoles((prev) => [...prev, role]);
      setNewRoleName("");
      setNewRoleColor("#a855f7");
      toast.success(`Role "${role.name}" created`);
    } catch { toast.error("Failed to create role"); }
    finally { setCreatingRole(false); }
  };

  const handleSaveRole = async () => {
    if (!editingRole) return;
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ id: editingRole.id, name: editingRole.name, color: editingRole.color }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setEditingRole(null);
      toast.success("Role updated");
    } catch { toast.error("Failed to update role"); }
  };

  const handleDeleteRole = async (id: string) => {
    setDeletingRole(id);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setRoles((prev) => prev.filter((r) => r.id !== id));
      toast.success("Role deleted");
    } catch { toast.error("Failed to delete role"); }
    finally { setDeletingRole(null); }
  };

  const customRoles = roles.filter((r) => !["admin", "moderator", "user"].includes(r.name));

  return (
    <div className="min-h-screen pb-24">
      {/* Sticky header */}
      <div className="border-b border-white/8 bg-black/80 backdrop-blur-sm sticky top-0 z-20">
        <Container className="py-3.5 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#ff4d6d] shrink-0" />
          <span className="text-sm font-bold text-white tracking-tight">Admin Panel</span>
          <span className="text-[11px] font-mono text-white/20 hidden sm:block">· anikitty.moe</span>
          <button
            onClick={onLogout}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/35 text-[11px] font-mono hover:text-white/70 hover:border-white/25 transition-all"
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </Container>
      </div>

      <Container className="py-8">
        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 border-b border-white/8 pb-4">
          {(["users", "roles"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t === "users" ? <Users className="w-4 h-4" /> : <Tag className="w-4 h-4" />}
              {t === "users" ? "Users" : "Roles"}
            </button>
          ))}
        </div>

        {/* ── USERS ─────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 max-w-sm">
              <Search className="w-4 h-4 text-white/30 shrink-0" />
              <input
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search by username or email…"
                className="bg-transparent text-sm text-white placeholder:text-white/25 outline-none flex-1"
              />
            </div>

            {usersLoading ? (
              <div className="flex items-center gap-2 py-8 text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading users…</span>
              </div>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[540px]">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider hidden md:table-cell">Joined</th>
                      <th className="px-4 py-3 w-24" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {users.map((u) => {
                      const selected = pendingRole[u.id] ?? u.role;
                      const dirty = pendingRole[u.id] !== undefined && pendingRole[u.id] !== u.role;
                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0">
                                  <Image src={u.avatarUrl} alt={u.username} fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center text-[13px] font-bold text-white/60 shrink-0">
                                  {u.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-white/85 truncate">@{u.username}</span>
                                {u.role !== "user" && <RoleBadge role={u.role} size="xs" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-white/35 text-xs hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={selected}
                              onChange={(e) => setPendingRole((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              className="bg-black border border-white/15 text-white/70 text-[11px] font-mono rounded-lg px-2 py-1 cursor-pointer hover:border-white/30 focus:outline-none"
                            >
                              {allRoleOptions.map((r) => (
                                <option key={r.id} value={r.name} className="bg-black">{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-white/25 text-xs hidden md:table-cell">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {dirty && (
                              <button
                                onClick={() => handleRoleChange(u.id, selected)}
                                disabled={savingRole === u.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 text-white/70 text-[11px] font-medium hover:bg-white/18 disabled:opacity-40 transition-all"
                              >
                                {savingRole === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                Save
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {users.length === 0 && (
                  <p className="text-center text-white/20 text-sm font-mono py-8">No users found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ROLES ─────────────────────────────────────────── */}
        {tab === "roles" && (
          <div className="flex flex-col gap-8 max-w-lg">
            {/* Built-ins */}
            <div>
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-3">Built-in</p>
              <div className="flex flex-col gap-2">
                {BUILTIN_ROLES.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02]">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <RoleBadge role={r.name} color={r.color} size="sm" />
                    <span className="text-[10px] text-white/20 font-mono ml-auto">{r.color} · cannot edit</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom */}
            <div>
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-3">Custom</p>

              {rolesLoading ? (
                <div className="flex items-center gap-2 py-4 text-white/25"><Loader2 className="w-4 h-4 animate-spin" /></div>
              ) : (
                <div className="flex flex-col gap-2 mb-4">
                  {customRoles.length === 0 && (
                    <p className="text-sm text-white/20 font-mono mb-2">No custom roles yet.</p>
                  )}
                  {customRoles.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/8 bg-white/[0.02]">
                      {editingRole?.id === r.id ? (
                        <>
                          <input
                            type="color"
                            value={editingRole.color}
                            onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-white/15 p-0.5 bg-transparent shrink-0"
                          />
                          <input
                            value={editingRole.name}
                            onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/15 rounded-lg px-3 py-1.5 text-sm text-white outline-none focus:border-white/30"
                          />
                          <div className="shrink-0">
                            <RoleBadge role={editingRole.name} color={editingRole.color} size="sm" />
                          </div>
                          <button onClick={handleSaveRole} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/18 text-white/60 hover:text-white transition-all">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditingRole(null)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/30 hover:text-white/60 transition-all">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                          <RoleBadge role={r.name} color={r.color} size="sm" />
                          <span className="text-[10px] text-white/25 font-mono">{r.color}</span>
                          <div className="ml-auto flex items-center gap-1">
                            <button onClick={() => setEditingRole(r)} className="p-1.5 rounded-lg hover:bg-white/8 text-white/25 hover:text-white/60 transition-all">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRole(r.id)}
                              disabled={deletingRole === r.id}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400/70 transition-all disabled:opacity-40"
                            >
                              {deletingRole === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Create */}
              <div className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-white/12">
                <input
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border border-white/15 p-0.5 bg-transparent shrink-0"
                  title="Pick color"
                />
                <input
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreateRole()}
                  placeholder="New role name…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none"
                />
                {newRoleName.trim() && (
                  <div className="shrink-0"><RoleBadge role={newRoleName} color={newRoleColor} size="sm" /></div>
                )}
                <button
                  onClick={handleCreateRole}
                  disabled={!newRoleName.trim() || creatingRole}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 text-xs font-semibold hover:bg-white/18 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all shrink-0"
                >
                  {creatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    setAuthed(!!token);
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthed(false);
  };

  if (authed === null) return null; // hydrating

  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;

  return <AdminPanel onLogout={handleLogout} />;
}
