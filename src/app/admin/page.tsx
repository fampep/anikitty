"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Container from "@/components/container";
import { RoleBadge } from "@/components/role-badge";
import {
  Search, Plus, Trash2, Loader2, ShieldCheck, Users, Tag,
  Check, X, Pencil, LogOut, Lock, Eye, EyeOff, Activity, RefreshCw,
  TrendingUp, Zap, Film, BarChart2, Megaphone, Info, AlertTriangle,
  AlertOctagon, CheckCircle2, ExternalLink, Send,
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
        const body = await res.json().catch(() => ({}));
        setError(body?.error ?? "Incorrect password.");
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
          {error && <p className="text-xs text-red-400/80 font-mono px-1">{error}</p>}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 border border-white/15 text-white font-semibold text-sm hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enter
          </button>
        </form>
        <p className="text-center text-[10px] font-mono text-white/15 mt-6">Session expires when tab is closed</p>
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
  lastActiveAt?: string | null;
}

interface Role {
  id: string;
  name: string;
  color: string;
}

interface ActivityEntry {
  progressId: string;
  animeId: string;
  episodeId: string;
  currentTime: number;
  duration: number;
  language: string | null;
  server: string | null;
  animeTitle: string | null;
  animeThumbnail: string | null;
  updatedAt: string | null;
  userId: string;
  username: string;
  avatarUrl: string | null;
  userRole: string;
}

interface StatsData {
  totalUsers: number;
  totalSessions: number;
  uniqueAnime: number;
  activeToday: number;
  activeWeek: number;
  newUsersWeek: number;
  totalComments?: number;
  totalThreads?: number;
  anilistLinked?: number;
  security?: {
    jwtSecret: boolean;
    adminPassword: boolean;
    adminJwtSecret: boolean;
    databaseUrl: boolean;
    warnings: string[];
  };
  topAnime: {
    animeId: string;
    animeTitle: string | null;
    animeThumbnail: string | null;
    sessionCount: number;
    uniqueUsers: number;
  }[];
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warn" | "critical" | "success" | string;
  isActive: boolean;
  dismissible: boolean;
  linkUrl: string | null;
  linkLabel: string | null;
  forumThreadId: string | null;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

const SEVERITY_META: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  info:     { label: "Info",     color: "#38bdf8", icon: Info },
  success:  { label: "Success",  color: "#22c55e", icon: CheckCircle2 },
  warn:     { label: "Warning",  color: "#f59e0b", icon: AlertTriangle },
  critical: { label: "Critical", color: "#ef4444", icon: AlertOctagon },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtSecs(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

const BUILTIN_ROLES = [
  { id: "__admin", name: "admin",     color: "#ff4d6d" },
  { id: "__mod",   name: "moderator", color: "#4d9fff" },
  { id: "__user",  name: "user",      color: "#888888" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Admin panel
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<"overview" | "users" | "roles" | "activity" | "announcements">("overview");

  // Users
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch]         = useState("");
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole]  = useState<string | null>(null);

  // Roles
  const [roles, setRoles]             = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [newRoleName, setNewRoleName]  = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#a855f7");
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole]  = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  // Activity
  const [activity, setActivity]         = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityView, setActivityView] = useState<"feed" | "live">("feed");

  // Stats
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Announcements
  const [anns, setAnns]             = useState<Announcement[]>([]);
  const [annsLoading, setAnnsLoading] = useState(false);
  const [annForm, setAnnForm]       = useState({ title: "", body: "", severity: "info" as Announcement["severity"], dismissible: true, linkUrl: "", linkLabel: "" });
  const [annCreating, setAnnCreating] = useState(false);
  const [annDeleting, setAnnDeleting] = useState<string | null>(null);
  const [annToggling, setAnnToggling] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────
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

  const fetchActivity = useCallback(async (view: "feed" | "live" = "feed") => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/activity?limit=100&view=${view}`, { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      const data = await res.json();
      setActivity(data.activity ?? []);
    } catch { toast.error("Failed to load activity"); }
    finally { setActivityLoading(false); }
  }, [onLogout]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      const data = await res.json();
      setStats(data);
    } catch { toast.error("Failed to load stats"); }
    finally { setStatsLoading(false); }
  }, [onLogout]);

  const fetchAnnouncements = useCallback(async () => {
    setAnnsLoading(true);
    try {
      const res = await fetch("/api/admin/announcements", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      const data = await res.json();
      setAnns(data.announcements ?? []);
    } catch { toast.error("Failed to load announcements"); }
    finally { setAnnsLoading(false); }
  }, [onLogout]);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchActivity();
    fetchStats();
    fetchAnnouncements();
  }, [fetchUsers, fetchRoles, fetchActivity, fetchStats, fetchAnnouncements]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUsers(search),
        fetchRoles(),
        fetchActivity(activityView),
        fetchStats(),
        fetchAnnouncements(),
      ]);
      toast.success("Dashboard refreshed");
    } finally {
      setRefreshing(false);
    }
  };

  // ── Search ───────────────────────────────────────────────────────────────
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

  // ── Role handlers ────────────────────────────────────────────────────────
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

  // ── Announcement handlers ────────────────────────────────────────────────
  const handleCreateAnn = async () => {
    if (!annForm.title.trim()) return;
    setAnnCreating(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          title: annForm.title,
          body: annForm.body,
          severity: annForm.severity,
          dismissible: annForm.dismissible,
          linkUrl: annForm.linkUrl || null,
          linkLabel: annForm.linkLabel || null,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const row = await res.json();
      setAnns((prev) => [row, ...prev]);
      setAnnForm({ title: "", body: "", severity: "info", dismissible: true, linkUrl: "", linkLabel: "" });
      toast.success("Announcement created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create"); }
    finally { setAnnCreating(false); }
  };

  const handleToggleAnn = async (id: string, current: boolean) => {
    setAnnToggling(id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ id, isActive: !current }),
      });
      if (!res.ok) throw new Error();
      const row = await res.json();
      setAnns((prev) => prev.map((a) => (a.id === id ? row : a)));
    } catch { toast.error("Failed to update"); }
    finally { setAnnToggling(null); }
  };

  const handleDeleteAnn = async (id: string) => {
    setAnnDeleting(id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      setAnns((prev) => prev.filter((a) => a.id !== id));
      toast.success("Announcement deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setAnnDeleting(null); }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-24">
      {/* Sticky header */}
      <div className="border-b border-white/8 bg-black/80 backdrop-blur-sm sticky top-0 z-20">
        <Container className="py-3.5 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#ff4d6d] shrink-0" />
          <span className="text-sm font-bold text-white tracking-tight">Admin Panel</span>
          <span className="text-[11px] font-mono text-white/20 hidden sm:block">· anikitty.moe</span>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/35 text-[11px] font-mono hover:text-white/70 hover:border-white/25 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/35 text-[11px] font-mono hover:text-white/70 hover:border-white/25 transition-all"
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </Container>
      </div>

      <Container className="py-8">
        {/* ── Stats bar ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          {((): { label: string; value: number | undefined; Icon: React.ElementType; color: string }[] => [
            { label: "Total Users",    value: stats?.totalUsers,    Icon: Users,    color: "#4d9fff" },
            { label: "Watch Sessions", value: stats?.totalSessions, Icon: Activity, color: "#a855f7" },
            { label: "Active Today",   value: stats?.activeToday,   Icon: Zap,      color: "#f59e0b" },
            { label: "AniList Linked", value: stats?.anilistLinked, Icon: TrendingUp, color: "#22d3ee" },
          ])().map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" style={{ color }} />
                <span className="text-[10px] font-mono text-white/30 uppercase tracking-wider truncate">{label}</span>
              </div>
              <span className="text-2xl font-bold text-white tabular-nums">
                {statsLoading ? "…" : (value ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-8 border-b border-white/8 pb-4 overflow-x-auto">
          {([
            { value: "overview"       as const, label: "Overview",      icon: <BarChart2  className="w-4 h-4" /> },
            { value: "users"          as const, label: "Users",         icon: <Users      className="w-4 h-4" /> },
            { value: "roles"          as const, label: "Roles",         icon: <Tag        className="w-4 h-4" /> },
            { value: "activity"       as const, label: "Activity",      icon: <Activity   className="w-4 h-4" /> },
            { value: "announcements"  as const, label: "Announcements", icon: <Megaphone  className="w-4 h-4" /> },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.value
                  ? "bg-white/10 text-white border border-white/15"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ───────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="flex flex-col gap-8">
            {/* Week summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Active this week",      value: stats?.activeWeek   ?? 0, sub: "unique viewers"  },
                { label: "New signups this week",  value: stats?.newUsersWeek ?? 0, sub: "new accounts"    },
                { label: "Comments & threads",   value: (stats?.totalComments ?? 0) + (stats?.totalThreads ?? 0), sub: `${stats?.totalComments ?? 0} comments · ${stats?.totalThreads ?? 0} threads` },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-5 py-5">
                  <p className="text-[10px] font-mono text-white/25 uppercase tracking-wider mb-2">{c.label}</p>
                  <p className="text-3xl font-bold text-white tabular-nums">
                    {statsLoading ? "…" : c.value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-white/20 mt-1">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Security status */}
            {stats?.security && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-5">
                <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Security configuration
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "JWT secret", ok: stats.security.jwtSecret },
                    { label: "Admin password", ok: stats.security.adminPassword },
                    { label: "Admin JWT", ok: stats.security.adminJwtSecret },
                    { label: "Database", ok: stats.security.databaseUrl },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/8 bg-black/20">
                      {item.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-mono text-white/50">{item.label}</span>
                    </div>
                  ))}
                </div>
                {stats.security.warnings.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {stats.security.warnings.map((w) => (
                      <li key={w} className="text-[11px] font-mono text-amber-400/80">· {w}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Top anime */}
            <div>
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Most Watched Anime
              </p>
              {statsLoading ? (
                <div className="flex items-center gap-2 py-8 text-white/25">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Loading…</span>
                </div>
              ) : (
                <div className="rounded-xl border border-white/10 overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-white/8 bg-white/[0.02]">
                        <th className="w-10 px-4 py-3 text-left text-[11px] font-mono text-white/25">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-white/30 uppercase tracking-wider">Anime</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-white/30 uppercase tracking-wider hidden sm:table-cell">Sessions</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-white/30 uppercase tracking-wider hidden md:table-cell">Viewers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {(stats?.topAnime ?? []).map((anime, i) => {
                        const maxSessions = stats?.topAnime[0]?.sessionCount ?? 1;
                        const pct = Math.round((anime.sessionCount / maxSessions) * 100);
                        return (
                          <tr key={anime.animeId} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-[12px] font-mono text-white/20">#{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {anime.animeThumbnail && (
                                  <div className="relative w-10 h-7 rounded overflow-hidden ring-1 ring-white/8 shrink-0">
                                    <Image src={anime.animeThumbnail} alt="" fill className="object-cover" unoptimized />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-white/80 truncate max-w-[220px]">
                                    {anime.animeTitle ?? anime.animeId}
                                  </p>
                                  <div className="mt-1 w-32 h-0.5 rounded-full bg-white/6 overflow-hidden">
                                    <div className="h-full rounded-full bg-white/25" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-[12px] font-mono text-white/50">{anime.sessionCount.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-[12px] font-mono text-white/30">{anime.uniqueUsers.toLocaleString()}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(stats?.topAnime ?? []).length === 0 && (
                    <p className="text-center text-white/20 text-sm font-mono py-8">No watch data yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 max-w-sm flex-1">
                <Search className="w-4 h-4 text-white/30 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username or email…"
                  className="bg-transparent text-sm text-white placeholder:text-white/25 outline-none flex-1"
                />
              </div>
              {!usersLoading && (
                <span className="text-[11px] font-mono text-white/25">{users.length} user{users.length !== 1 ? "s" : ""}</span>
              )}
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
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider hidden lg:table-cell">Last active</th>
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
                          <td className="px-4 py-3 text-white/25 text-xs hidden lg:table-cell">
                            {u.lastActiveAt ? timeAgo(u.lastActiveAt) : "—"}
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

        {/* ── ROLES ──────────────────────────────────────────────── */}
        {tab === "roles" && (
          <div className="flex flex-col gap-8 max-w-lg">
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
                          <div className="shrink-0"><RoleBadge role={editingRole.name} color={editingRole.color} size="sm" /></div>
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

        {/* ── ACTIVITY ───────────────────────────────────────────── */}
        {tab === "activity" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {/* Feed / Live toggle */}
                <div className="flex rounded-lg border border-white/10 overflow-hidden">
                  {(["feed", "live"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setActivityView(v); fetchActivity(v); }}
                      className={`px-3.5 py-1.5 text-[11px] font-mono capitalize transition-all ${
                        activityView === v
                          ? "bg-white/12 text-white"
                          : "text-white/35 hover:text-white/65"
                      }`}
                    >
                      {v === "live" ? "⚡ Live" : "Feed"}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-white/25">
                  {activityView === "live"
                    ? `${activity.length} active user${activity.length !== 1 ? "s" : ""}`
                    : `${activity.length} session${activity.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <button
                onClick={() => fetchActivity(activityView)}
                disabled={activityLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-white/35 text-[11px] font-mono hover:text-white/70 hover:border-white/25 transition-all disabled:opacity-30"
              >
                <RefreshCw className={`w-3 h-3 ${activityLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {activityLoading ? (
              <div className="flex items-center gap-2 py-8 text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : activity.length === 0 ? (
              <p className="text-center text-white/20 text-sm font-mono py-8">No watch activity yet</p>
            ) : (
              <div className="rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-white/8 bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider">Anime</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider hidden md:table-cell">Progress</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-white/30 uppercase tracking-wider hidden sm:table-cell">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {activity.map((entry) => {
                      const pct = entry.duration > 0
                        ? Math.min(100, Math.round((entry.currentTime / entry.duration) * 100))
                        : 0;
                      const updatedAt = entry.updatedAt
                        ? (typeof entry.updatedAt === "string" ? entry.updatedAt : String(entry.updatedAt))
                        : null;
                      return (
                        <tr key={entry.progressId} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {entry.avatarUrl ? (
                                <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0">
                                  <Image src={entry.avatarUrl} alt={entry.username} fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-[12px] font-bold text-white/60 shrink-0">
                                  {entry.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-medium text-white/80 truncate">@{entry.username}</span>
                                {entry.userRole !== "user" && <RoleBadge role={entry.userRole} size="xs" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {entry.animeThumbnail && (
                                <div className="relative w-10 h-7 rounded overflow-hidden ring-1 ring-white/8 shrink-0">
                                  <Image src={entry.animeThumbnail} alt="" fill className="object-cover" unoptimized />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[12px] font-medium text-white/75 truncate max-w-[180px]">
                                  {entry.animeTitle ?? entry.animeId}
                                </p>
                                <p className="text-[10px] font-mono text-white/30">
                                  {entry.episodeId.replace("ep-", "EP ")} · {entry.language ?? "sub"}
                                  {entry.server && <span className="ml-1 text-white/20">· {entry.server}</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-col gap-1.5 min-w-[110px]">
                              <div className="w-full h-1 rounded-full bg-white/8 overflow-hidden">
                                <div className="h-full rounded-full bg-white/40" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-white/25">
                                {pct}% · {fmtSecs(entry.currentTime)}
                                {entry.duration > 0 && <span> / {fmtSecs(entry.duration)}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[11px] font-mono text-white/30">
                              {updatedAt ? timeAgo(updatedAt) : "—"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* ── ANNOUNCEMENTS ──────────────────────────────────────── */}
        {tab === "announcements" && (
          <div className="flex flex-col gap-8 max-w-2xl">
            {/* Create form */}
            <div className="rounded-xl border border-dashed border-white/12 p-5 flex flex-col gap-4">
              <p className="text-[11px] font-mono text-white/25 uppercase tracking-widest">New Announcement</p>

              {/* Severity + Title */}
              <div className="flex gap-2">
                <select
                  value={annForm.severity}
                  onChange={(e) => setAnnForm((f) => ({ ...f, severity: e.target.value as Announcement["severity"] }))}
                  className="shrink-0 bg-black border border-white/15 text-white/70 text-[11px] font-mono rounded-lg px-2 py-2 focus:outline-none focus:border-white/30"
                >
                  {Object.entries(SEVERITY_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-black">{v.label}</option>
                  ))}
                </select>
                <input
                  value={annForm.title}
                  onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Title (required)"
                  className="flex-1 bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Body */}
              <textarea
                value={annForm.body}
                onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Body text (optional)"
                rows={2}
                className="bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors resize-none"
              />

              {/* Link */}
              <div className="flex gap-2">
                <input
                  value={annForm.linkUrl}
                  onChange={(e) => setAnnForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="Link URL (optional)"
                  className="flex-1 bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
                <input
                  value={annForm.linkLabel}
                  onChange={(e) => setAnnForm((f) => ({ ...f, linkLabel: e.target.value }))}
                  placeholder="Button label"
                  className="w-36 bg-white/[0.04] border border-white/12 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
                />
              </div>

              {/* Dismissible + Submit */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={annForm.dismissible}
                    onChange={(e) => setAnnForm((f) => ({ ...f, dismissible: e.target.checked }))}
                    className="accent-white/60 w-3.5 h-3.5"
                  />
                  <span className="text-[12px] text-white/45 font-mono">Dismissible</span>
                </label>
                <button
                  onClick={handleCreateAnn}
                  disabled={!annForm.title.trim() || annCreating}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white/10 border border-white/15 text-white/70 text-sm font-semibold hover:bg-white/18 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  {annCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publish
                </button>
              </div>
            </div>

            {/* List */}
            {annsLoading ? (
              <div className="flex items-center gap-2 py-4 text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : anns.length === 0 ? (
              <p className="text-sm font-mono text-white/20 py-4">No announcements yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {anns.map((a) => {
                  const meta = SEVERITY_META[a.severity] ?? SEVERITY_META.info;
                  const SevIcon = meta.icon;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border px-4 py-4 flex flex-col gap-2 transition-opacity ${a.isActive ? "border-white/12 bg-white/[0.02]" : "border-white/6 bg-white/[0.01] opacity-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <SevIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-white/85 truncate">{a.title}</span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border"
                              style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}10` }}
                            >
                              {meta.label}
                            </span>
                            {!a.dismissible && (
                              <span className="text-[10px] font-mono text-white/25 border border-white/10 px-1.5 py-0.5 rounded-md">pinned</span>
                            )}
                            {!a.isActive && (
                              <span className="text-[10px] font-mono text-white/20 border border-white/8 px-1.5 py-0.5 rounded-md">inactive</span>
                            )}
                          </div>
                          {a.body && <p className="text-[12px] text-white/45 mt-1 line-clamp-2">{a.body}</p>}
                          {a.linkUrl && (
                            <a
                              href={a.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/60 mt-1 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {a.linkLabel ?? a.linkUrl}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleAnn(a.id, a.isActive)}
                            disabled={annToggling === a.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all disabled:opacity-40 ${
                              a.isActive
                                ? "border-white/15 text-white/40 hover:text-white/70 hover:border-white/25"
                                : "border-emerald-500/25 text-emerald-400/60 hover:text-emerald-300 hover:border-emerald-400/40"
                            }`}
                          >
                            {annToggling === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (a.isActive ? "Deactivate" : "Activate")}
                          </button>
                          <button
                            onClick={() => handleDeleteAnn(a.id)}
                            disabled={annDeleting === a.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/25 hover:text-red-400/70 transition-all disabled:opacity-40"
                          >
                            {annDeleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {a.createdAt && (
                        <p className="text-[10px] font-mono text-white/15 pl-7">{timeAgo(a.createdAt)}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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

  if (authed === null) return null;
  if (!authed) return <AdminLogin onSuccess={() => setAuthed(true)} />;
  return <AdminPanel onLogout={handleLogout} />;
}
