"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useIntervalWhenVisible } from "@/hooks/use-interval-when-visible";
import { usePollingIntervalMs } from "@/hooks/use-polling-interval-ms";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/container";
import { RoleBadge } from "@/components/profile/role-badge";
import {
  Search, Plus, Trash2, Loader2, ShieldCheck, Users, Tag,
  Check, X, Pencil, LogOut, Lock, Eye, EyeOff, Activity, RefreshCw,
  TrendingUp, Zap, BarChart2, Megaphone, Info, AlertTriangle,
  AlertOctagon, CheckCircle2, ExternalLink, Send, MessageCircle, Key, ShieldOff,
  VolumeX, Ban, Clock, Banknote, Coins, Sparkles, Calendar, Flag, ScrollText, SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { chatExpiresInLabel, formatChatTtlLabel } from "@/lib/social/chat-config";
import { cn } from "@/lib/core/utils";

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
          <div className="w-12 h-12 rounded-2xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          </div>
          <h1 className="text-xl font-bold text-foreground dark:text-white tracking-tight">Admin Access</h1>
          <p className="text-sm text-muted-foreground dark:text-white/35 text-center">This area is restricted. Enter the admin passphrase to continue.</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin passphrase"
              autoFocus
              className="w-full bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-xl px-4 py-3 pr-11 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/60 transition-colors"
            >
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {error && <p className="text-xs text-red-400/80 font-mono px-1">{error}</p>}
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-foreground dark:text-white font-semibold text-sm hover:bg-muted dark:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Enter
          </button>
        </form>
        <p className="text-center text-[10px] font-mono text-muted-foreground/50 dark:text-white/15 mt-6">Session expires when tab is closed</p>
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
  totpEnabled?: boolean;
  kittycoinBalance?: number;
  supporterUntil?: string | null;
  moderation?: {
    banned: boolean;
    banReason: string | null;
    muted: boolean;
    mutedUntil: string | null;
    muteReason: string | null;
  };
}

interface PermissionDef {
  id: string;
  label: string;
  description: string;
  group: "content" | "users" | "perks";
}

interface Role {
  id: string;
  name: string;
  color: string;
  permissions: string[];
  builtin?: boolean;
}

interface DeletionRequest {
  id: string;
  userId: string;
  username: string;
  email: string;
  role: string;
  reason: string | null;
  requestedAt: string | null;
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

interface ReportRow {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string | null;
  reporterUsername: string | null;
  targetUsername: string | null;
  targetUserId: string | null;
  commentBody: string | null;
  commentAnimeId: string | null;
}

interface SkipSubmissionRow {
  id: string;
  anilistId: number;
  malId: number | null;
  animeTitle: string | null;
  episode: number;
  introStart: number | null;
  introEnd: number | null;
  outroStart: number | null;
  outroEnd: number | null;
  introLabel: string | null;
  outroLabel: string | null;
  notes: string | null;
  status: string;
  rejectReason: string | null;
  createdAt: string | null;
  username: string | null;
  userId: string;
  submitterApproved?: number;
  nearTimestampHelper?: boolean;
}

interface AuditRow {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  reason: string | null;
  metadata: unknown;
  createdAt: string | null;
  actorUsername: string | null;
  actorAvatarUrl: string | null;
  targetUsername: string | null;
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
  totalChatMessages?: number;
  chatMessagesToday?: number;
  chatMessagesLive?: number;
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

interface AdminChatMessage {
  id: string;
  body: string;
  gifUrl: string | null;
  createdAt: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  role: string;
  active: boolean;
}

interface ChatModerationData {
  messageTtlMs: number;
  totalCount: number;
  activeCount: number;
  expiredCount: number;
  messages: AdminChatMessage[];
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

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatSupporterUntil(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (d.getTime() <= Date.now()) return "Expired";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const BUILTIN_ROLE_NAMES = new Set(["admin", "moderator", "user"]);

function RolePermissionEditor({
  role,
  permissionDefs,
  onToggle,
  readOnly,
}: {
  role: Role;
  permissionDefs: PermissionDef[];
  onToggle: (role: Role, permId: string, enabled: boolean) => void;
  readOnly?: boolean;
}) {
  const hasAll = role.permissions.includes("*");
  const groups: Array<{ key: PermissionDef["group"]; label: string }> = [
    { key: "content", label: "Content" },
    { key: "users", label: "Users" },
    { key: "perks", label: "Perks" },
  ];

  return (
    <div className="mt-3 pt-3 border-t border-border dark:border-white/8 space-y-3">
      {role.name === "admin" ? (
        <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono">Admins always have full access.</p>
      ) : role.name === "user" ? (
        <p className="text-[11px] text-muted-foreground dark:text-white/35 font-mono">Regular users have no staff permissions.</p>
      ) : (
        groups.map((group) => {
          const perms = permissionDefs.filter((p) => p.group === group.key);
          if (!perms.length) return null;
          return (
            <div key={group.key}>
              <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-2">{group.label}</p>
              <div className="flex flex-col gap-2">
                {perms.map((perm) => {
                  const checked = hasAll || role.permissions.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className={cn(
                        "flex items-start gap-2.5 text-xs cursor-pointer",
                        readOnly && "opacity-60 cursor-default",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={readOnly || hasAll}
                        onChange={(e) => onToggle(role, perm.id, e.target.checked)}
                        className="mt-0.5 rounded border-border dark:border-white/20 bg-transparent"
                      />
                      <span>
                        <span className="text-foreground/85 dark:text-white/75 font-medium">{perm.label}</span>
                        <span className="block text-muted-foreground dark:text-white/30 text-[10px] mt-0.5">{perm.description}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin panel
// ─────────────────────────────────────────────────────────────────────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const adminChatPollMs = usePollingIntervalMs("adminChat");
  const [tab, setTab] = useState<"overview" | "users" | "roles" | "activity" | "announcements" | "chat" | "reports" | "skipTimes" | "audit">("overview");

  // Users
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [pendingRole, setPendingRole] = useState<Record<string, string>>({});
  const [savingRole, setSavingRole]  = useState<string | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<DeletionRequest[]>([]);
  const [deletionLoading, setDeletionLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [disabling2faUserId, setDisabling2faUserId] = useState<string | null>(null);
  const [resettingPasswordUserId, setResettingPasswordUserId] = useState<string | null>(null);

  // Roles
  const [roles, setRoles]             = useState<Role[]>([]);
  const [permissionDefs, setPermissionDefs] = useState<PermissionDef[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [newRoleName, setNewRoleName]  = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#a855f7");
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([]);
  const [creatingRole, setCreatingRole] = useState(false);
  const [editingRole, setEditingRole]  = useState<Role | null>(null);
  const [editingPermissionsRole, setEditingPermissionsRole] = useState<Role | null>(null);
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [moderatingUserId, setModeratingUserId] = useState<string | null>(null);

  // Activity
  const [activity, setActivity]         = useState<ActivityEntry[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityView, setActivityView] = useState<"feed" | "live">("feed");

  // Reports + audit
  const [reports, setReports]           = useState<ReportRow[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [skipSubmissions, setSkipSubmissions] = useState<SkipSubmissionRow[]>([]);
  const [skipSubmissionsLoading, setSkipSubmissionsLoading] = useState(false);
  const [reviewingSkipId, setReviewingSkipId] = useState<string | null>(null);
  const [skipRejectDrafts, setSkipRejectDrafts] = useState<Record<string, string>>({});
  const [audit, setAudit]               = useState<AuditRow[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Stats
  const [stats, setStats]           = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Announcements
  const [anns, setAnns]             = useState<Announcement[]>([]);
  const [annsLoading, setAnnsLoading] = useState(false);
  const [annForm, setAnnForm] = useState({
    title: "",
    body: "",
    severity: "info" as Announcement["severity"],
    dismissible: true,
    linkUrl: "",
    linkLabel: "",
    startsAt: "",
    endsAt: "",
  });
  const [annCreating, setAnnCreating] = useState(false);
  const [annDeleting, setAnnDeleting] = useState<string | null>(null);
  const [annToggling, setAnnToggling] = useState<string | null>(null);
  const [editingAnn, setEditingAnn] = useState<Announcement | null>(null);
  const [annEditForm, setAnnEditForm] = useState({
    title: "",
    body: "",
    severity: "info" as Announcement["severity"],
    dismissible: true,
    linkUrl: "",
    linkLabel: "",
    startsAt: "",
    endsAt: "",
  });
  const [annSaving, setAnnSaving] = useState<string | null>(null);
  const [annPosting, setAnnPosting] = useState<string | null>(null);
  const [grantingUserId, setGrantingUserId] = useState<string | null>(null);
  const [dismissingRequestId, setDismissingRequestId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Live chat moderation
  const [chatData, setChatData]         = useState<ChatModerationData | null>(null);
  const [chatLoading, setChatLoading]   = useState(false);
  const [chatDeleting, setChatDeleting] = useState<string | null>(null);
  const [chatPurging, setChatPurging]   = useState<"expired" | "all" | null>(null);

  // Site-wide click ads
  const [globalClickAdsEnabled, setGlobalClickAdsEnabled] = useState<boolean | null>(null);
  const [globalClickAdsSaving, setGlobalClickAdsSaving] = useState(false);

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (q?: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
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
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setRoles(data.roles ?? []);
      setPermissionDefs(data.permissionDefs ?? []);
    } catch { toast.error("Failed to load roles"); }
    finally { setRolesLoading(false); }
  }, [onLogout]);

  const fetchActivity = useCallback(async (view: "feed" | "live" = "feed") => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/admin/activity?limit=100&view=${view}`, { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load activity"); return; }
      const data = await res.json();
      setActivity(Array.isArray(data.activity) ? data.activity : []);
    } catch { toast.error("Failed to load activity"); }
    finally { setActivityLoading(false); }
  }, [onLogout]);

  const fetchReports = useCallback(async () => {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports?status=open", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setReports(data.reports ?? []);
    } catch { toast.error("Failed to load reports"); }
    finally { setReportsLoading(false); }
  }, [onLogout]);

  const resolveReport = useCallback(async (id: string, action: "resolve" | "dismiss") => {
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) throw new Error();
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch { toast.error("Failed to update report"); }
  }, []);

  const fetchSkipSubmissions = useCallback(async () => {
    setSkipSubmissionsLoading(true);
    try {
      const res = await fetch("/api/admin/skip-submissions?status=pending", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load skip submissions"); return; }
      const data = await res.json();
      setSkipSubmissions(data.submissions ?? []);
    } catch { toast.error("Failed to load skip submissions"); }
    finally { setSkipSubmissionsLoading(false); }
  }, [onLogout]);

  const reviewSkipSubmission = useCallback(async (id: string, action: "approve" | "reject") => {
    setReviewingSkipId(id);
    try {
      const res = await fetch("/api/admin/skip-submissions", {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          action,
          rejectReason: action === "reject" ? (skipRejectDrafts[id]?.trim() || null) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Review failed");
      }
      setSkipSubmissions((prev) => prev.filter((s) => s.id !== id));
      setSkipRejectDrafts((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(action === "approve" ? "Skip times approved" : "Skip times declined");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to review submission");
    } finally {
      setReviewingSkipId(null);
    }
  }, [skipRejectDrafts]);

  const fetchAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await fetch("/api/admin/audit?limit=150", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setAudit(data.entries ?? []);
    } catch { toast.error("Failed to load audit log"); }
    finally { setAuditLoading(false); }
  }, [onLogout]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/stats", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load stats"); return; }
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
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setAnns(data.announcements ?? []);
    } catch { toast.error("Failed to load announcements"); }
    finally { setAnnsLoading(false); }
  }, [onLogout]);

  const fetchChat = useCallback(async () => {
    setChatLoading(true);
    try {
      const res = await fetch("/api/admin/chat?limit=100", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setChatData(data);
    } catch { toast.error("Failed to load chat"); }
    finally { setChatLoading(false); }
  }, [onLogout]);

  const fetchDeletionRequests = useCallback(async () => {
    setDeletionLoading(true);
    try {
      const res = await fetch("/api/admin/deletion-requests", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) { toast.error("Failed to load admin data"); return; }
      const data = await res.json();
      setDeletionRequests(data.requests ?? []);
    } catch { toast.error("Failed to load deletion requests"); }
    finally { setDeletionLoading(false); }
  }, [onLogout]);

  const fetchGlobalClickAds = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/settings/click-ads", { headers: adminHeaders() });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) return;
      const data = (await res.json()) as { enabled?: boolean };
      setGlobalClickAdsEnabled(data.enabled !== false);
    } catch { toast.error("Failed to load click ads setting"); }
  }, [onLogout]);

  const saveGlobalClickAds = async (enabled: boolean) => {
    setGlobalClickAdsSaving(true);
    try {
      const res = await fetch("/api/admin/settings/click-ads", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (res.status === 403) { onLogout(); return; }
      if (!res.ok) {
        toast.error("Failed to update click ads setting");
        return;
      }
      setGlobalClickAdsEnabled(enabled);
      toast.success(enabled ? "Click ads enabled site-wide" : "Click ads disabled site-wide");
    } catch {
      toast.error("Failed to update click ads setting");
    } finally {
      setGlobalClickAdsSaving(false);
    }
  };

  // Load only what the default (overview) tab needs on mount — the heavier
  // per-tab queries (users, roles, announcements, chat…) load when their tab is
  // opened, so they don't compete with the overview's stats/activity queries.
  useEffect(() => {
    fetchStats();
    fetchActivity();
    fetchGlobalClickAds();
    fetchDeletionRequests();
  }, [fetchStats, fetchActivity, fetchGlobalClickAds, fetchDeletionRequests]);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUsers(search),
        fetchRoles(),
        fetchActivity(activityView),
        fetchStats(),
        fetchAnnouncements(),
        fetchChat(),
        fetchDeletionRequests(),
        fetchGlobalClickAds(),
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

  const allRoleOptions = roles;

  const filteredUsers = roleFilter === "all"
    ? users
    : users.filter((u) => u.role === roleFilter);

  const deletionRequestUserIds = new Set(deletionRequests.map((r) => r.userId));

  const handleDeleteChatMessage = async (messageId: string) => {
    setChatDeleting(messageId);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error();
      setChatData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.filter((m) => m.id !== messageId),
              totalCount: Math.max(0, prev.totalCount - 1),
              activeCount: Math.max(
                0,
                prev.activeCount -
                  (prev.messages.find((m) => m.id === messageId)?.active ? 1 : 0),
              ),
            }
          : prev,
      );
      toast.success("Message deleted");
    } catch { toast.error("Failed to delete message"); }
    finally { setChatDeleting(null); }
  };

  const handlePurgeChat = async (kind: "expired" | "all") => {
    if (kind === "all" && !confirm("Delete ALL chat messages? This cannot be undone.")) return;
    setChatPurging(kind);
    try {
      const res = await fetch("/api/admin/chat", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify(kind === "all" ? { purgeAll: true } : { purgeExpired: true }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Removed ${data.deleted ?? 0} message${data.deleted === 1 ? "" : "s"}`);
      await fetchChat();
      await fetchStats();
    } catch { toast.error("Purge failed"); }
    finally { setChatPurging(null); }
  };

  useEffect(() => {
    if (tab === "users") { void fetchUsers(); void fetchRoles(); }
    if (tab === "roles") void fetchRoles();
    if (tab === "announcements") void fetchAnnouncements();
    if (tab === "chat") void fetchChat();
    if (tab === "reports") void fetchReports();
    if (tab === "skipTimes") void fetchSkipSubmissions();
    if (tab === "audit") void fetchAudit();
  }, [tab, fetchUsers, fetchRoles, fetchAnnouncements, fetchChat, fetchReports, fetchSkipSubmissions, fetchAudit]);

  useIntervalWhenVisible(fetchChat, adminChatPollMs, tab === "chat");

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

  const handleDeleteUser = async (user: Pick<AdminUser, "id" | "username">) => {
    if (!confirm(`Permanently delete @${user.username}? This cannot be undone.`)) return;
    setDeletingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE", headers: adminHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Delete failed");
      toast.success(`@${user.username} deleted`);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setDeletionRequests((prev) => prev.filter((r) => r.userId !== user.id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete user");
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleDisable2fa = async (user: Pick<AdminUser, "id" | "username">) => {
    if (!confirm(`Disable two-factor authentication for @${user.username}?`)) return;
    setDisabling2faUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "disable2fa" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to disable 2FA");
      toast.success(`2FA disabled for @${user.username}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, totpEnabled: false } : u)));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to disable 2FA");
    } finally {
      setDisabling2faUserId(null);
    }
  };

  const handleResetPassword = async (user: Pick<AdminUser, "id" | "username">) => {
    const password = prompt(`Set a new password for @${user.username} (min. 8 characters):`);
    if (password === null) return;
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (!confirm(`Reset password for @${user.username}? All active sessions will be signed out.`)) return;
    setResettingPasswordUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "resetPassword", password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to reset password");
      toast.success(`Password reset for @${user.username}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to reset password");
    } finally {
      setResettingPasswordUserId(null);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          name: newRoleName.trim(),
          color: newRoleColor,
          permissions: newRolePermissions,
        }),
      });
      if (!res.ok) throw new Error();
      const role = await res.json();
      setRoles((prev) => [...prev, role]);
      setNewRoleName("");
      setNewRoleColor("#a855f7");
      setNewRolePermissions([]);
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
        body: JSON.stringify({
          id: editingRole.builtin ? undefined : editingRole.id,
          roleName: editingRole.builtin ? editingRole.name : undefined,
          name: editingRole.name,
          color: editingRole.color,
          permissions: editingRole.permissions,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === editingRole.id ? { ...updated, id: editingRole.id } : r)));
      setEditingRole(null);
      toast.success("Role updated");
    } catch { toast.error("Failed to update role"); }
  };

  const handleSavePermissions = async (role: Role) => {
    setSavingPermissions(role.id);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify(
          role.builtin
            ? { roleName: role.name, permissions: role.permissions }
            : { id: role.id, permissions: role.permissions },
        ),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setRoles((prev) => prev.map((r) => (r.id === role.id ? { ...updated, id: role.id } : r)));
      setEditingPermissionsRole(null);
      toast.success(`Permissions saved for ${role.name}`);
    } catch {
      toast.error("Failed to save permissions");
    } finally {
      setSavingPermissions(null);
    }
  };

  const toggleRolePermission = (role: Role, permId: string, enabled: boolean) => {
    const next = { ...role };
    if (permId === "*") {
      next.permissions = enabled ? ["*"] : [];
    } else if (enabled) {
      const withoutWildcard = role.permissions.filter((p) => p !== "*");
      next.permissions = withoutWildcard.includes(permId)
        ? withoutWildcard
        : [...withoutWildcard, permId];
    } else {
      next.permissions = role.permissions.filter((p) => p !== permId && p !== "*");
    }
    if (editingPermissionsRole?.id === role.id) {
      setEditingPermissionsRole(next);
    }
    setRoles((prev) => prev.map((r) => (r.id === role.id ? next : r)));
  };

  const handleModerateUser = async (
    user: AdminUser,
    action: "mute" | "unmute" | "ban" | "unban",
    opts?: { reason?: string; durationHours?: number },
  ) => {
    const labels = { mute: "mute", unmute: "unmute", ban: "ban", unban: "unban" };
    if (action === "ban" && !confirm(`Ban @${user.username}? They will be signed out immediately.`)) return;
    if (action === "mute" && !confirm(`Mute @${user.username} for ${opts?.durationHours ?? 24} hours?`)) return;

    setModeratingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action, ...opts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `Failed to ${labels[action]} user`);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, moderation: data.moderation } : u)),
      );
      toast.success(`@${user.username} ${labels[action]}d`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : `Failed to ${labels[action]} user`);
    } finally {
      setModeratingUserId(null);
    }
  };

  const handleMuteUser = (user: AdminUser) => {
    const hoursStr = prompt(`Mute @${user.username} for how many hours?`, "24");
    if (hoursStr === null) return;
    const hours = Math.min(8760, Math.max(1, parseInt(hoursStr, 10) || 24));
    const reason = prompt("Reason (optional):") ?? "";
    void handleModerateUser(user, "mute", { durationHours: hours, reason: reason || undefined });
  };

  const handleBanUser = (user: AdminUser) => {
    const reason = prompt(`Ban reason for @${user.username} (optional):`) ?? "";
    void handleModerateUser(user, "ban", { reason: reason || undefined });
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

  const customRoles = roles.filter((r) => !r.builtin && !BUILTIN_ROLE_NAMES.has(r.name));
  const builtinRoles = roles.filter((r) => r.builtin);

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
          startsAt: annForm.startsAt ? new Date(annForm.startsAt).toISOString() : null,
          endsAt: annForm.endsAt ? new Date(annForm.endsAt).toISOString() : null,
          isActive: true,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const row = await res.json();
      setAnns((prev) => [row, ...prev]);
      setAnnForm({
        title: "",
        body: "",
        severity: "info",
        dismissible: true,
        linkUrl: "",
        linkLabel: "",
        startsAt: "",
        endsAt: "",
      });
      toast.success("Announcement created");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to create"); }
    finally { setAnnCreating(false); }
  };

  const openEditAnn = (a: Announcement) => {
    setEditingAnn(a);
    setAnnEditForm({
      title: a.title,
      body: a.body ?? "",
      severity: (a.severity as Announcement["severity"]) ?? "info",
      dismissible: a.dismissible,
      linkUrl: a.linkUrl ?? "",
      linkLabel: a.linkLabel ?? "",
      startsAt: toDatetimeLocalValue(a.startsAt),
      endsAt: toDatetimeLocalValue(a.endsAt),
    });
  };

  const handleSaveAnn = async () => {
    if (!editingAnn || !annEditForm.title.trim()) return;
    setAnnSaving(editingAnn.id);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({
          id: editingAnn.id,
          title: annEditForm.title,
          body: annEditForm.body,
          severity: annEditForm.severity,
          dismissible: annEditForm.dismissible,
          linkUrl: annEditForm.linkUrl || null,
          linkLabel: annEditForm.linkLabel || null,
          startsAt: annEditForm.startsAt ? new Date(annEditForm.startsAt).toISOString() : null,
          endsAt: annEditForm.endsAt ? new Date(annEditForm.endsAt).toISOString() : null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const row = await res.json();
      setAnns((prev) => prev.map((a) => (a.id === editingAnn.id ? row : a)));
      setEditingAnn(null);
      toast.success("Announcement updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setAnnSaving(null);
    }
  };

  const handlePostAnnToForum = async (id: string) => {
    setAnnPosting(id);
    try {
      const res = await fetch(`/api/admin/announcements/${id}/post-to-forum`, {
        method: "POST",
        headers: adminHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to post");
      setAnns((prev) =>
        prev.map((a) => (a.id === id ? { ...a, forumThreadId: data.threadId } : a)),
      );
      toast.success(data.alreadyPosted ? "Forum thread already linked" : "Posted to forum");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to post to forum");
    } finally {
      setAnnPosting(null);
    }
  };

  const handleGrantKittycoins = async (user: AdminUser) => {
    const raw = prompt(`Grant kittycoins to @${user.username} (use negative to deduct):`, "100");
    if (raw == null) return;
    const delta = parseInt(raw, 10);
    if (!Number.isFinite(delta) || delta === 0) {
      toast.error("Enter a non-zero integer");
      return;
    }
    setGrantingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "grantKittycoins", delta }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, kittycoinBalance: data.balance } : u)),
      );
      toast.success(`Balance updated: ${data.balance?.toLocaleString?.() ?? data.balance} coins`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grant coins");
    } finally {
      setGrantingUserId(null);
    }
  };

  const handleGrantSupporter = async (user: AdminUser) => {
    const raw = prompt(`Grant supporter days to @${user.username}:`, "30");
    if (raw == null) return;
    const days = parseInt(raw, 10);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Enter a positive number of days");
      return;
    }
    setGrantingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "grantSupporter", days }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id ? { ...u, supporterUntil: data.supporterUntil, role: u.role === "user" ? "donator" : u.role } : u,
        ),
      );
      toast.success(`Supporter until ${formatSupporterUntil(data.supporterUntil)}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to grant supporter");
    } finally {
      setGrantingUserId(null);
    }
  };

  const handleRevokeSupporter = async (user: AdminUser) => {
    if (!confirm(`Revoke supporter perks for @${user.username}?`)) return;
    setGrantingUserId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ action: "revokeSupporter" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, supporterUntil: null, role: u.role === "donator" ? "user" : u.role }
            : u,
        ),
      );
      toast.success("Supporter perks revoked");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to revoke");
    } finally {
      setGrantingUserId(null);
    }
  };

  const handleDismissDeletionRequest = async (requestId: string) => {
    setDismissingRequestId(requestId);
    try {
      const res = await fetch("/api/admin/deletion-requests", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ requestId }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      setDeletionRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Deletion request dismissed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to dismiss");
    } finally {
      setDismissingRequestId(null);
    }
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
      <div className="border-b border-border dark:border-white/8 bg-black/80 backdrop-blur-sm sticky top-0 z-20">
        <Container className="py-3.5 flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-[#ff4d6d] shrink-0" />
          <span className="text-sm font-bold text-foreground dark:text-white tracking-tight">Admin Panel</span>
          <span className="text-[11px] font-mono text-muted-foreground/70 dark:text-white/20 hidden sm:block">· anikitty.moe</span>
          <button
            onClick={refreshAll}
            disabled={refreshing}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/35 text-[11px] font-mono hover:text-muted-foreground dark:text-white/70 hover:border-border dark:border-white/25 transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <Link
            href="/chat"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/25 text-violet-300/80 text-[11px] font-mono hover:bg-violet-500/10 transition-all"
          >
            <MessageCircle className="w-3 h-3" /> Live Chat
          </Link>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/35 text-[11px] font-mono hover:text-muted-foreground dark:text-white/70 hover:border-border dark:border-white/25 transition-all"
          >
            <LogOut className="w-3 h-3" /> Logout
          </button>
        </Container>
      </div>

      <Container className="py-8">
        {/* ── Stats bar ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          {((): { label: string; value: number | undefined; Icon: React.ElementType; color: string }[] => [
            { label: "Total Users",    value: stats?.totalUsers,         Icon: Users,         color: "#4d9fff" },
            { label: "Watch Sessions", value: stats?.totalSessions,      Icon: Activity,      color: "#a855f7" },
            { label: "Unique Anime",   value: stats?.uniqueAnime,        Icon: TrendingUp,    color: "#22d3ee" },
            { label: "Active Today",   value: stats?.activeToday,        Icon: Zap,           color: "#f59e0b" },
            { label: "Chat Messages",  value: stats?.totalChatMessages,  Icon: MessageCircle, color: "#c084fc" },
          ])().map(({ label, value, Icon, color }) => (
            <div key={label} className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-3.5 h-3.5 shrink-0 opacity-60" style={{ color }} />
                <span className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider truncate">{label}</span>
              </div>
              <span className="text-2xl font-bold text-foreground dark:text-white tabular-nums">
                {statsLoading ? "…" : (value ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 mb-8 border-b border-border dark:border-white/8 pb-4 overflow-x-auto">
          {([
            { value: "overview"       as const, label: "Overview",      icon: <BarChart2  className="w-4 h-4" /> },
            { value: "users"          as const, label: "Users",         icon: <Users      className="w-4 h-4" /> },
            { value: "roles"          as const, label: "Roles",         icon: <Tag        className="w-4 h-4" /> },
            { value: "activity"       as const, label: "Activity",      icon: <Activity   className="w-4 h-4" /> },
            { value: "reports"        as const, label: "Reports",       icon: <Flag       className="w-4 h-4" /> },
            { value: "skipTimes"      as const, label: "Skip Times",    icon: <SkipForward className="w-4 h-4" /> },
            { value: "audit"          as const, label: "Audit Log",     icon: <ScrollText className="w-4 h-4" /> },
            { value: "chat"           as const, label: "Live Chat",     icon: <MessageCircle className="w-4 h-4" /> },
            { value: "announcements"  as const, label: "Announcements", icon: <Megaphone  className="w-4 h-4" /> },
          ]).map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                tab === t.value
                  ? "bg-accent dark:bg-white/10 text-white border border-border dark:border-white/15"
                  : "text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70"
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Active this week",      value: stats?.activeWeek   ?? 0, sub: "unique viewers"  },
                { label: "New signups this week",  value: stats?.newUsersWeek ?? 0, sub: "new accounts"    },
                { label: "AniList linked",         value: stats?.anilistLinked ?? 0, sub: "accounts with sync" },
                { label: "Comments & threads",   value: (stats?.totalComments ?? 0) + (stats?.totalThreads ?? 0), sub: `${stats?.totalComments ?? 0} comments · ${stats?.totalThreads ?? 0} threads` },
                { label: "Chat messages today",  value: stats?.chatMessagesToday ?? 0, sub: `${stats?.chatMessagesLive ?? 0} visible in live window` },
                { label: "Total chat stored",    value: stats?.totalChatMessages ?? 0, sub: "all time in database" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-5 py-5">
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-wider mb-2">{c.label}</p>
                  <p className="text-3xl font-bold text-foreground dark:text-white tabular-nums">
                    {statsLoading ? "…" : c.value.toLocaleString()}
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 mt-1">{c.sub}</p>
                </div>
              ))}
            </div>

            {/* Security status */}
            {stats?.security && (
              <div className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] p-5">
                <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" /> Security configuration
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "JWT secret", ok: stats.security.jwtSecret },
                    { label: "Admin password", ok: stats.security.adminPassword },
                    { label: "Admin JWT", ok: stats.security.adminJwtSecret },
                    { label: "Database", ok: stats.security.databaseUrl },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border dark:border-white/8 bg-black/20">
                      {item.ok ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-[11px] font-mono text-muted-foreground dark:text-white/50">{item.label}</span>
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

            {/* Site-wide click ads */}
            <div className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] p-5">
              <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Banknote className="w-3.5 h-3.5" /> Site settings
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground dark:text-white/85">Global site ads</p>
                  <p className="text-[11px] text-muted-foreground dark:text-white/35 mt-1 leading-relaxed max-w-xl">
                    Turn click ads on or off for everyone. Saved in the database — survives redeploys. Signed-in users can also disable ads in Settings.
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 mt-2">
                    Status:{" "}
                    {globalClickAdsEnabled == null
                      ? "Loading…"
                      : globalClickAdsEnabled
                        ? "Enabled site-wide"
                        : "Disabled site-wide"}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={globalClickAdsEnabled == null || globalClickAdsSaving}
                  onClick={() => void saveGlobalClickAds(!globalClickAdsEnabled)}
                  className={cn(
                    "shrink-0 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed",
                    globalClickAdsEnabled
                      ? "border-amber-400/25 bg-amber-500/10 text-amber-100 hover:bg-amber-500/15"
                      : "border-emerald-400/25 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/15",
                  )}
                >
                  {globalClickAdsSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : globalClickAdsEnabled ? (
                    "Turn off globally"
                  ) : (
                    "Turn on globally"
                  )}
                </button>
              </div>
            </div>

            {/* Top anime */}
            <div>
              <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-4 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Most Watched Anime
              </p>
              {statsLoading ? (
                <div className="flex items-center gap-2 py-8 text-muted-foreground/80 dark:text-white/25">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-mono">Loading…</span>
                </div>
              ) : (
                <div className="rounded-xl border border-border dark:border-white/10 overflow-x-auto">
                  <table className="w-full text-sm min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                        <th className="w-10 px-4 py-3 text-left text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">#</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">Anime</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden sm:table-cell">Sessions</th>
                        <th className="px-4 py-3 text-left text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">Viewers</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {(stats?.topAnime ?? []).map((anime, i) => {
                        const maxSessions = stats?.topAnime[0]?.sessionCount ?? 1;
                        const pct = Math.round((anime.sessionCount / maxSessions) * 100);
                        return (
                          <tr key={anime.animeId} className="hover:bg-muted/30 dark:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 text-[12px] font-mono text-muted-foreground/70 dark:text-white/20">#{i + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                {anime.animeThumbnail && (
                                  <div className="relative w-10 h-7 rounded overflow-hidden ring-1 ring-white/8 shrink-0">
                                    <Image src={anime.animeThumbnail} alt="" fill className="object-cover" unoptimized />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-[12px] font-medium text-foreground/90 dark:text-white/80 truncate max-w-[220px]">
                                    {anime.animeTitle ?? anime.animeId}
                                  </p>
                                  <div className="mt-1 w-32 h-0.5 rounded-full bg-muted/60 dark:bg-muted/60 dark:bg-white/6 overflow-hidden">
                                    <div className="h-full rounded-full bg-white/25" style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-[12px] font-mono text-muted-foreground dark:text-white/50">{anime.sessionCount.toLocaleString()}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-[12px] font-mono text-muted-foreground dark:text-white/30">{anime.uniqueUsers.toLocaleString()}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {(stats?.topAnime ?? []).length === 0 && (
                    <p className="text-center text-muted-foreground/70 dark:text-white/20 text-sm font-mono py-8">No watch data yet</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── USERS ──────────────────────────────────────────────── */}
        {tab === "users" && (
          <div className="flex flex-col gap-5">
            {(deletionLoading || deletionRequests.length > 0) && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-amber-500/15">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-200/90">Deletion requests</span>
                    {!deletionLoading && (
                      <span className="text-[11px] font-mono text-amber-200/50">{deletionRequests.length} pending</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchDeletionRequests()}
                    disabled={deletionLoading}
                    className="text-[11px] font-mono text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/60 transition-colors disabled:opacity-40"
                  >
                    Refresh
                  </button>
                </div>
                {deletionLoading ? (
                  <div className="flex items-center gap-2 px-4 py-4 text-muted-foreground/80 dark:text-white/25">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm font-mono">Loading requests…</span>
                  </div>
                ) : (
                  <div className="divide-y divide-amber-500/10">
                    {deletionRequests.map((req) => (
                      <div key={req.id} className="flex items-start justify-between gap-4 px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground dark:text-white/85">@{req.username}</p>
                          <p className="text-xs text-muted-foreground dark:text-white/35 mt-0.5">{req.email}</p>
                          {req.reason && (
                            <p className="text-xs text-muted-foreground dark:text-white/45 mt-2 leading-relaxed">&ldquo;{req.reason}&rdquo;</p>
                          )}
                          {req.requestedAt && (
                            <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 mt-1.5">
                              Requested {new Date(req.requestedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleDismissDeletionRequest(req.id)}
                            disabled={dismissingRequestId === req.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/15 text-muted-foreground dark:text-white/55 text-[11px] font-medium hover:bg-accent dark:bg-white/8 disabled:opacity-40 transition-all"
                          >
                            {dismissingRequestId === req.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <X className="w-3.5 h-3.5" />
                            )}
                            Dismiss
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(req)}
                            disabled={deletingUserId === req.userId}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-[11px] font-medium hover:bg-red-500/15 disabled:opacity-40 transition-all"
                          >
                            {deletingUserId === req.userId ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Delete account
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/10 rounded-xl px-4 py-2.5 max-w-sm flex-1">
                <Search className="w-4 h-4 text-muted-foreground dark:text-white/30 shrink-0" />
                <input
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder="Search by username or email…"
                  className="bg-transparent text-sm text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 outline-none flex-1"
                />
              </div>
              {!usersLoading && (
                <span className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">
                  {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
                  {roleFilter !== "all" ? ` · ${roleFilter}` : ""}
                </span>
              )}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-black border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-[11px] font-mono rounded-lg px-2.5 py-2 cursor-pointer hover:border-border dark:border-white/30 focus:outline-none"
              >
                <option value="all" className="bg-black">All roles</option>
                {allRoleOptions.map((r) => (
                  <option key={r.id} value={r.name} className="bg-black">{r.name}</option>
                ))}
              </select>
            </div>

            {usersLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground/80 dark:text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading users…</span>
              </div>
            ) : (
              <div className="rounded-xl border border-border dark:border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">Status</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">2FA</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden lg:table-cell">Perks</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">Joined</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden lg:table-cell">Last active</th>
                      <th className="px-4 py-3 w-40" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filteredUsers.map((u) => {
                      const selected = pendingRole[u.id] ?? u.role;
                      const dirty = pendingRole[u.id] !== undefined && pendingRole[u.id] !== u.role;
                      return (
                        <tr key={u.id} className={cn("hover:bg-muted/30 dark:bg-white/[0.02] transition-colors", deletionRequestUserIds.has(u.id) && "bg-amber-500/[0.03]")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {u.avatarUrl ? (
                                <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-border dark:ring-white/10 shrink-0">
                                  <Image src={u.avatarUrl} alt={u.username} fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-accent dark:bg-white/8 flex items-center justify-center text-[13px] font-bold text-muted-foreground dark:text-white/60 shrink-0">
                                  {u.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-foreground dark:text-white/85 truncate">@{u.username}</span>
                                {u.role !== "user" && <RoleBadge role={u.role} size="xs" />}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground dark:text-white/35 text-xs hidden sm:table-cell">{u.email}</td>
                          <td className="px-4 py-3">
                            <select
                              value={selected}
                              onChange={(e) => setPendingRole((prev) => ({ ...prev, [u.id]: e.target.value }))}
                              className="bg-black border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-[11px] font-mono rounded-lg px-2 py-1 cursor-pointer hover:border-border dark:border-white/30 focus:outline-none"
                            >
                              {allRoleOptions.map((r) => (
                                <option key={r.id} value={r.name} className="bg-black">{r.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {u.moderation?.banned ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-red-400/90">
                                <Ban className="w-3 h-3" /> Banned
                              </span>
                            ) : u.moderation?.muted ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-amber-400/90" title={u.moderation.mutedUntil ?? undefined}>
                                <VolumeX className="w-3 h-3" /> Muted
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20">OK</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {u.totpEnabled ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400/80">
                                <ShieldCheck className="w-3 h-3" /> On
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">Off</span>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <div className="flex flex-col gap-0.5 text-[10px] font-mono">
                              <span className="text-muted-foreground dark:text-white/45">
                                <Coins className="w-3 h-3 inline mr-1 opacity-60" />
                                {(u.kittycoinBalance ?? 0).toLocaleString()}
                              </span>
                              <span className="text-muted-foreground/80 dark:text-white/30">
                                <Sparkles className="w-3 h-3 inline mr-1 opacity-60" />
                                {formatSupporterUntil(u.supporterUntil)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80 dark:text-white/25 text-xs hidden md:table-cell">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground/80 dark:text-white/25 text-xs hidden lg:table-cell">
                            {u.lastActiveAt ? timeAgo(u.lastActiveAt) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {dirty && (
                                <button
                                  onClick={() => handleRoleChange(u.id, selected)}
                                  disabled={savingRole === u.id}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent dark:bg-white/10 border border-border dark:border-white/20 text-muted-foreground dark:text-white/70 text-[11px] font-medium hover:bg-white/18 disabled:opacity-40 transition-all"
                                >
                                  {savingRole === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                  Save
                                </button>
                              )}
                              {u.role !== "admin" && (
                                <>
                                  {u.moderation?.muted ? (
                                    <button
                                      type="button"
                                      onClick={() => handleModerateUser(u, "unmute")}
                                      disabled={moderatingUserId === u.id}
                                      title="Unmute"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/20 text-emerald-300/70 text-[11px] hover:bg-emerald-500/10 disabled:opacity-40 transition-all"
                                    >
                                      {moderatingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <VolumeX className="w-3 h-3" />}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleMuteUser(u)}
                                      disabled={moderatingUserId === u.id || u.moderation?.banned}
                                      title="Mute / timeout"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-300/70 text-[11px] hover:bg-amber-500/10 disabled:opacity-40 transition-all"
                                    >
                                      <Clock className="w-3 h-3" />
                                    </button>
                                  )}
                                  {u.moderation?.banned ? (
                                    <button
                                      type="button"
                                      onClick={() => handleModerateUser(u, "unban")}
                                      disabled={moderatingUserId === u.id}
                                      title="Unban"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-emerald-500/20 text-emerald-300/70 text-[11px] hover:bg-emerald-500/10 disabled:opacity-40 transition-all"
                                    >
                                      {moderatingUserId === u.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3" />}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleBanUser(u)}
                                      disabled={moderatingUserId === u.id}
                                      title="Ban user"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/20 text-red-300/70 text-[11px] hover:bg-red-500/10 disabled:opacity-40 transition-all"
                                    >
                                      <Ban className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                              {u.totpEnabled && (
                                <button
                                  type="button"
                                  onClick={() => handleDisable2fa(u)}
                                  disabled={disabling2faUserId === u.id}
                                  title="Disable 2FA"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-300/70 text-[11px] hover:bg-amber-500/10 hover:text-amber-300 disabled:opacity-40 transition-all"
                                >
                                  {disabling2faUserId === u.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <ShieldOff className="w-3 h-3" />
                                  )}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleGrantKittycoins(u)}
                                disabled={grantingUserId === u.id}
                                title="Grant kittycoins"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-amber-500/20 text-amber-300/70 text-[11px] hover:bg-amber-500/10 disabled:opacity-40 transition-all"
                              >
                                <Coins className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleGrantSupporter(u)}
                                disabled={grantingUserId === u.id}
                                title="Grant supporter days"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-violet-500/20 text-violet-300/70 text-[11px] hover:bg-violet-500/10 disabled:opacity-40 transition-all"
                              >
                                <Sparkles className="w-3 h-3" />
                              </button>
                              {(u.supporterUntil || u.role === "donator") && u.role !== "admin" && (
                                <button
                                  type="button"
                                  onClick={() => handleRevokeSupporter(u)}
                                  disabled={grantingUserId === u.id}
                                  title="Revoke supporter"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border dark:border-white/15 text-muted-foreground dark:text-white/40 text-[11px] hover:bg-accent dark:bg-white/8 disabled:opacity-40 transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleResetPassword(u)}
                                disabled={resettingPasswordUserId === u.id}
                                title="Reset password"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-border dark:border-white/15 text-muted-foreground dark:text-white/45 text-[11px] hover:bg-accent dark:bg-white/8 hover:text-muted-foreground dark:text-white/70 disabled:opacity-40 transition-all"
                              >
                                {resettingPasswordUserId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Key className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingUserId === u.id}
                                title="Delete account"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-red-500/20 text-red-300/70 text-[11px] hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40 transition-all"
                              >
                                {deletingUserId === u.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Trash2 className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredUsers.length === 0 && (
                  <p className="text-center text-muted-foreground/70 dark:text-white/20 text-sm font-mono py-8">No users found</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── ROLES ──────────────────────────────────────────────── */}
        {tab === "roles" && (
          <div className="flex flex-col gap-8 max-w-2xl">
            <p className="text-sm text-muted-foreground dark:text-white/40 leading-relaxed">
              Assign roles to users on the Users tab. Customize what each role can do — e.g. a comments-only mod with just comment moderation, or full mods who can mute, timeout, and ban.
            </p>

            {rolesLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground/80 dark:text-white/25"><Loader2 className="w-4 h-4 animate-spin" /></div>
            ) : (
              <>
                <div>
                  <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">Built-in roles</p>
                  <div className="flex flex-col gap-3">
                    {builtinRoles.map((r) => {
                      const editing = editingPermissionsRole?.id === r.id;
                      const roleState = editing ? editingPermissionsRole! : r;
                      const canEditPerms = r.name === "moderator";
                      return (
                        <div key={r.id} className="px-4 py-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                            <RoleBadge role={r.name} color={r.color} size="sm" />
                            <span className="text-[10px] text-muted-foreground/70 dark:text-white/20 font-mono">{r.color}</span>
                            {canEditPerms && (
                              <div className="ml-auto flex items-center gap-1">
                                {editing ? (
                                  <>
                                    <button
                                      onClick={() => handleSavePermissions(roleState)}
                                      disabled={savingPermissions === r.id}
                                      className="px-2.5 py-1 rounded-lg bg-accent dark:bg-white/10 text-[11px] text-muted-foreground dark:text-white/70 hover:bg-white/18 disabled:opacity-40"
                                    >
                                      {savingPermissions === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Save"}
                                    </button>
                                    <button onClick={() => setEditingPermissionsRole(null)} className="p-1.5 rounded-lg hover:bg-accent dark:bg-white/8 text-muted-foreground dark:text-white/30">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => setEditingPermissionsRole(r)}
                                    className="px-2.5 py-1 rounded-lg border border-border dark:border-white/12 text-[11px] text-muted-foreground dark:text-white/45 hover:text-muted-foreground dark:text-white/70"
                                  >
                                    Edit permissions
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                          {(editing || r.name === "moderator") && (
                            <RolePermissionEditor
                              role={roleState}
                              permissionDefs={permissionDefs}
                              onToggle={(role, permId, enabled) => {
                                toggleRolePermission(role, permId, enabled);
                                if (editing) setEditingPermissionsRole((prev) => {
                                  if (!prev || prev.id !== role.id) return prev;
                                  const next = { ...prev };
                                  if (permId === "*") next.permissions = enabled ? ["*"] : [];
                                  else if (enabled) next.permissions = [...prev.permissions.filter((p) => p !== "*"), permId];
                                  else next.permissions = prev.permissions.filter((p) => p !== permId);
                                  return next;
                                });
                              }}
                              readOnly={!editing && !canEditPerms}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest mb-3">Custom roles</p>
                  <div className="flex flex-col gap-3 mb-4">
                    {customRoles.length === 0 && (
                      <p className="text-sm text-muted-foreground/70 dark:text-white/20 font-mono mb-2">No custom roles yet. Create one below — e.g. <span className="text-muted-foreground dark:text-white/40">comments_mod</span>.</p>
                    )}
                    {customRoles.map((r) => {
                      const editing = editingPermissionsRole?.id === r.id;
                      const roleState = editing ? editingPermissionsRole! : r;
                      return (
                        <div key={r.id} className="px-4 py-3 rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                          {editingRole?.id === r.id ? (
                            <div className="flex items-center gap-3 flex-wrap">
                              <input
                                type="color"
                                value={editingRole.color}
                                onChange={(e) => setEditingRole({ ...editingRole, color: e.target.value })}
                                className="w-7 h-7 rounded-lg cursor-pointer border border-border dark:border-white/15 p-0.5 bg-transparent shrink-0"
                              />
                              <input
                                value={editingRole.name}
                                onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                                className="flex-1 bg-muted/50 dark:bg-white/5 border border-border dark:border-white/15 rounded-lg px-3 py-1.5 text-sm text-foreground dark:text-white outline-none focus:border-border dark:border-white/30"
                              />
                              <button onClick={handleSaveRole} className="p-1.5 rounded-lg bg-accent dark:bg-white/10 hover:bg-white/18 text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white transition-all">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingRole(null)} className="p-1.5 rounded-lg hover:bg-accent dark:bg-white/8 text-muted-foreground dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/60 transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                              <RoleBadge role={r.name} color={r.color} size="sm" />
                              <span className="text-[10px] text-muted-foreground/80 dark:text-white/25 font-mono">{r.color}</span>
                              <div className="ml-auto flex items-center gap-1">
                                <button
                                  onClick={() => setEditingPermissionsRole(r)}
                                  className="px-2 py-1 rounded-lg border border-border dark:border-white/12 text-[10px] text-muted-foreground dark:text-white/45 hover:text-muted-foreground dark:text-white/70"
                                >
                                  Permissions
                                </button>
                                <button onClick={() => setEditingRole(r)} className="p-1.5 rounded-lg hover:bg-accent dark:bg-white/8 text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/60 transition-all">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteRole(r.id)}
                                  disabled={deletingRole === r.id}
                                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground/80 dark:text-white/25 hover:text-red-400/70 transition-all disabled:opacity-40"
                                >
                                  {deletingRole === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>
                          )}
                          {editing && (
                            <>
                              <RolePermissionEditor
                                role={roleState}
                                permissionDefs={permissionDefs}
                                onToggle={(role, permId, enabled) => {
                                  toggleRolePermission(role, permId, enabled);
                                  setEditingPermissionsRole((prev) => {
                                    if (!prev || prev.id !== role.id) return prev;
                                    const next = { ...prev };
                                    if (permId === "*") next.permissions = enabled ? ["*"] : [];
                                    else if (enabled) next.permissions = [...prev.permissions.filter((p) => p !== "*"), permId];
                                    else next.permissions = prev.permissions.filter((p) => p !== permId);
                                    return next;
                                  });
                                }}
                              />
                              <button
                                onClick={() => handleSavePermissions(roleState)}
                                disabled={savingPermissions === r.id}
                                className="mt-3 px-3 py-1.5 rounded-lg bg-accent dark:bg-white/10 text-xs text-muted-foreground dark:text-white/70 hover:bg-white/18 disabled:opacity-40"
                              >
                                {savingPermissions === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin inline" /> : "Save permissions"}
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 rounded-xl border border-dashed border-border dark:border-white/12 space-y-3">
                    <p className="text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest">Create role</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <input
                        type="color"
                        value={newRoleColor}
                        onChange={(e) => setNewRoleColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-border dark:border-white/15 p-0.5 bg-transparent shrink-0"
                      />
                      <input
                        value={newRoleName}
                        onChange={(e) => setNewRoleName(e.target.value)}
                        placeholder="e.g. comments_mod"
                        className="flex-1 min-w-[140px] bg-transparent text-sm text-foreground dark:text-white placeholder:text-muted-foreground/80 dark:placeholder:text-white/25 outline-none"
                      />
                      {newRoleName.trim() && (
                        <RoleBadge role={newRoleName} color={newRoleColor} size="sm" />
                      )}
                      <button
                        onClick={handleCreateRole}
                        disabled={!newRoleName.trim() || creatingRole}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-xs font-semibold hover:bg-white/18 hover:text-foreground dark:text-white disabled:opacity-25 transition-all"
                      >
                        {creatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        Create
                      </button>
                    </div>
                    {newRoleName.trim() && permissionDefs.length > 0 && (
                      <RolePermissionEditor
                        role={{ id: "__new", name: newRoleName, color: newRoleColor, permissions: newRolePermissions }}
                        permissionDefs={permissionDefs}
                        onToggle={(_role, permId, enabled) => {
                          setNewRolePermissions((prev) => {
                            if (enabled) return prev.includes(permId) ? prev : [...prev, permId];
                            return prev.filter((p) => p !== permId);
                          });
                        }}
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── ACTIVITY ───────────────────────────────────────────── */}
        {tab === "activity" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                {/* Feed / Live toggle */}
                <div className="flex rounded-lg border border-border dark:border-white/10 overflow-hidden">
                  {(["feed", "live"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => { setActivityView(v); fetchActivity(v); }}
                      className={`px-3.5 py-1.5 text-[11px] font-mono capitalize transition-all ${
                        activityView === v
                          ? "bg-accent dark:bg-white/12 text-white"
                          : "text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/65"
                      }`}
                    >
                      {v === "live" ? "⚡ Live" : "Feed"}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">
                  {activityView === "live"
                    ? `${activity.length} active user${activity.length !== 1 ? "s" : ""}`
                    : `${activity.length} session${activity.length !== 1 ? "s" : ""}`}
                </span>
              </div>
              <button
                onClick={() => fetchActivity(activityView)}
                disabled={activityLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/35 text-[11px] font-mono hover:text-muted-foreground dark:text-white/70 hover:border-border dark:border-white/25 transition-all disabled:opacity-30"
              >
                <RefreshCw className={`w-3 h-3 ${activityLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {activityLoading ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground/80 dark:text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : activity.length === 0 ? (
              <p className="text-center text-muted-foreground/70 dark:text-white/20 text-sm font-mono py-8">No watch activity yet</p>
            ) : (
              <div className="rounded-xl border border-border dark:border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="border-b border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">Anime</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">Progress</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden sm:table-cell">When</th>
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
                        <tr key={entry.progressId} className="hover:bg-muted/30 dark:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              {entry.avatarUrl ? (
                                <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-border dark:ring-white/10 shrink-0">
                                  <Image src={entry.avatarUrl} alt={entry.username} fill className="object-cover" unoptimized />
                                </div>
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-accent dark:bg-white/8 flex items-center justify-center text-[12px] font-bold text-muted-foreground dark:text-white/60 shrink-0">
                                  {entry.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="text-[12px] font-medium text-foreground/90 dark:text-white/80 truncate">@{entry.username}</span>
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
                                <p className="text-[12px] font-medium text-foreground/85 dark:text-white/75 truncate max-w-[180px]">
                                  {entry.animeTitle ?? entry.animeId}
                                </p>
                                <p className="text-[10px] font-mono text-muted-foreground dark:text-white/30">
                                  {entry.episodeId.replace("ep-", "EP ")} · {entry.language ?? "sub"}
                                  {entry.server && <span className="ml-1 text-muted-foreground/70 dark:text-white/20">· {entry.server}</span>}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="flex flex-col gap-1.5 min-w-[110px]">
                              <div className="w-full h-1 rounded-full bg-accent dark:bg-white/8 overflow-hidden">
                                <div className="h-full rounded-full bg-muted/40 dark:bg-white/40" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25">
                                {pct}% · {fmtSecs(entry.currentTime)}
                                {entry.duration > 0 && <span> / {fmtSecs(entry.duration)}</span>}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="text-[11px] font-mono text-muted-foreground dark:text-white/30">
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
        {/* ── REPORTS ────────────────────────────────────────────── */}
        {tab === "reports" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Open reports</h2>
              <button
                onClick={() => fetchReports()}
                className="text-xs font-mono text-white/40 hover:text-white/70"
              >
                Refresh
              </button>
            </div>
            {reportsLoading ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">Loading…</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">No open reports 🎉</p>
            ) : (
              reports.map((r) => (
                <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 font-mono uppercase">{r.reason}</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50 font-mono">{r.targetType}</span>
                    <span className="text-white/40">
                      reported by <span className="text-white/70">{r.reporterUsername ?? "?"}</span>
                      {r.targetUsername && <> · against <span className="text-white/70">{r.targetUsername}</span></>}
                    </span>
                  </div>
                  {r.commentBody != null && (
                    <p className="text-sm text-white/70 bg-black/30 rounded-lg px-3 py-2 border border-white/5 line-clamp-4 whitespace-pre-wrap">
                      {r.commentBody || <span className="text-white/30 italic">(no text)</span>}
                    </p>
                  )}
                  {r.details && <p className="text-xs text-white/45 italic">“{r.details}”</p>}
                  <div className="flex items-center gap-2 pt-1">
                    {r.targetType === "comment" && r.commentAnimeId && (
                      <a
                        href={`/anime/${r.commentAnimeId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-white/60 hover:text-white/90 hover:bg-white/5"
                      >
                        View
                      </a>
                    )}
                    <button
                      onClick={() => resolveReport(r.id, "resolve")}
                      className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    >
                      Resolve
                    </button>
                    <button
                      onClick={() => resolveReport(r.id, "dismiss")}
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-white/50 hover:text-white/80 hover:bg-white/5"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── SKIP TIMES ─────────────────────────────────────────── */}
        {tab === "skipTimes" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Pending skip times</h2>
              <button
                onClick={() => fetchSkipSubmissions()}
                className="text-xs font-mono text-white/40 hover:text-white/70"
              >
                Refresh
              </button>
            </div>
            {skipSubmissionsLoading ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">Loading…</p>
            ) : skipSubmissions.length === 0 ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">No pending skip submissions 🎉</p>
            ) : (
              skipSubmissions.map((s) => (
                <div key={s.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {s.animeTitle ?? `AniList #${s.anilistId}`}
                      </p>
                      <p className="text-xs text-white/45 font-mono mt-0.5">
                        Episode {s.episode}
                        {s.username && (
                          <>
                            {" "}
                            · submitted by{" "}
                            <span className="text-white/70">{s.username}</span>
                            {typeof s.submitterApproved === "number" && s.submitterApproved > 0 && (
                              <span className="text-sky-300/80">
                                {" "}
                                · {s.submitterApproved} approved
                                {s.nearTimestampHelper && " · near Timestamp Helper"}
                              </span>
                            )}
                          </>
                        )}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-white/30 shrink-0">
                      {s.createdAt ? timeAgo(s.createdAt) : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-white/8 bg-black/25 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wide text-white/35 mb-1">Intro</p>
                      <p className="text-white/75 font-mono">{s.introLabel ?? "—"}</p>
                    </div>
                    <div className="rounded-lg border border-white/8 bg-black/25 px-3 py-2">
                      <p className="text-[10px] font-mono uppercase tracking-wide text-white/35 mb-1">Outro / credits</p>
                      <p className="text-white/75 font-mono">{s.outroLabel ?? "—"}</p>
                    </div>
                  </div>
                  {s.notes && (
                    <p className="text-xs text-white/50 italic border-l-2 border-violet-500/30 pl-3">“{s.notes}”</p>
                  )}
                  <input
                    type="text"
                    value={skipRejectDrafts[s.id] ?? ""}
                    onChange={(e) =>
                      setSkipRejectDrafts((prev) => ({ ...prev, [s.id]: e.target.value }))
                    }
                    placeholder="Decline reason (optional)"
                    className="w-full rounded-lg px-3 py-2 text-xs bg-black/40 border border-white/10 text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-rose-400/30"
                  />
                  <div className="flex items-center gap-2 pt-1 flex-wrap">
                    <a
                      href={`/anime/watch?anime=${s.anilistId}&episode=ep-${s.episode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-3 py-1.5 rounded-lg border border-white/12 text-white/60 hover:text-white/90 hover:bg-white/5"
                    >
                      Watch episode
                    </a>
                    <button
                      onClick={() => reviewSkipSubmission(s.id, "approve")}
                      disabled={reviewingSkipId === s.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"
                    >
                      {reviewingSkipId === s.id ? "Saving…" : "Approve"}
                    </button>
                    <button
                      onClick={() => reviewSkipSubmission(s.id, "reject")}
                      disabled={reviewingSkipId === s.id}
                      className="text-xs px-3 py-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/15 disabled:opacity-40"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── AUDIT LOG ──────────────────────────────────────────── */}
        {tab === "audit" && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Moderation audit log</h2>
              <button
                onClick={() => fetchAudit()}
                className="text-xs font-mono text-white/40 hover:text-white/70"
              >
                Refresh
              </button>
            </div>
            {auditLoading ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">Loading…</p>
            ) : audit.length === 0 ? (
              <p className="text-sm text-white/40 py-10 text-center font-mono">No actions logged yet.</p>
            ) : (
              <div className="rounded-xl border border-white/10 bg-white/[0.02] divide-y divide-white/5">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 font-mono shrink-0">
                      {a.action}
                    </span>
                    <span className="text-white/70 shrink-0">{a.actorUsername ?? "Admin panel"}</span>
                    {a.targetUsername && (
                      <span className="text-white/40">→ <span className="text-white/60">{a.targetUsername}</span></span>
                    )}
                    {a.reason && <span className="text-white/35 italic truncate">“{a.reason}”</span>}
                    <span className="ml-auto text-white/25 font-mono shrink-0">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── LIVE CHAT ──────────────────────────────────────────── */}
        {tab === "chat" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-foreground/90 dark:text-white/80">Live chat moderation</p>
                <p className="text-[11px] font-mono text-muted-foreground dark:text-white/30">
                  Messages auto-expire after{" "}
                  {formatChatTtlLabel(chatData?.messageTtlMs ?? 2 * 60 * 60 * 1000)} · refreshes every 10s
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => fetchChat()}
                  disabled={chatLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border dark:border-white/10 text-muted-foreground dark:text-white/35 text-[11px] font-mono hover:text-muted-foreground dark:text-white/70 hover:border-border dark:border-white/25 transition-all disabled:opacity-30"
                >
                  <RefreshCw className={`w-3 h-3 ${chatLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
                <button
                  onClick={() => handlePurgeChat("expired")}
                  disabled={!!chatPurging || (chatData?.expiredCount ?? 0) === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/25 text-amber-300/80 text-[11px] font-mono hover:bg-amber-500/10 transition-all disabled:opacity-30"
                >
                  {chatPurging === "expired" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Purge expired ({chatData?.expiredCount ?? 0})
                </button>
                <button
                  onClick={() => handlePurgeChat("all")}
                  disabled={!!chatPurging || (chatData?.totalCount ?? 0) === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-500/25 text-red-300/80 text-[11px] font-mono hover:bg-red-500/10 transition-all disabled:opacity-30"
                >
                  {chatPurging === "all" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                  Clear all
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Visible now", value: chatData?.activeCount ?? 0, color: "#c084fc" },
                { label: "Expired in DB", value: chatData?.expiredCount ?? 0, color: "#f59e0b" },
                { label: "Total stored", value: chatData?.totalCount ?? 0, color: "#94a3b8" },
              ].map((c) => (
                <div key={c.label} className="rounded-xl border border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02] px-4 py-4">
                  <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-wider mb-2">{c.label}</p>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: c.color }}>
                    {chatLoading ? "…" : c.value.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>

            {chatLoading && !chatData ? (
              <div className="flex items-center gap-2 py-8 text-muted-foreground/80 dark:text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading chat…</span>
              </div>
            ) : (chatData?.messages ?? []).length === 0 ? (
              <p className="text-center text-muted-foreground/70 dark:text-white/20 text-sm font-mono py-8">No chat messages</p>
            ) : (
              <div className="rounded-xl border border-border dark:border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="border-b border-border dark:border-white/8 bg-muted/30 dark:bg-white/[0.02]">
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider">Message</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden md:table-cell">Sent</th>
                      <th className="text-left px-4 py-3 text-[11px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-wider hidden sm:table-cell">Expires</th>
                      <th className="px-4 py-3 w-16" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {(chatData?.messages ?? []).map((m) => (
                      <tr
                        key={m.id}
                        className={`hover:bg-muted/30 dark:bg-white/[0.02] transition-colors ${!m.active ? "opacity-50" : ""}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            {m.avatarUrl ? (
                              <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-border dark:ring-white/10 shrink-0">
                                <Image src={m.avatarUrl} alt={m.username} fill className="object-cover" unoptimized />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-accent dark:bg-white/8 flex items-center justify-center text-[12px] font-bold text-muted-foreground dark:text-white/60 shrink-0">
                                {m.username[0]?.toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0">
                              <span className="text-[12px] font-medium text-foreground/90 dark:text-white/80 truncate">@{m.username}</span>
                              {m.role !== "user" && <RoleBadge role={m.role} size="xs" />}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-md">
                          {m.body ? (
                            <p className="text-[12px] text-muted-foreground dark:text-white/65 whitespace-pre-wrap break-words line-clamp-3">{m.body}</p>
                          ) : null}
                          {m.gifUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={m.gifUrl}
                              alt="GIF"
                              className="mt-1.5 rounded-lg max-h-16 w-auto ring-1 ring-border dark:ring-white/10"
                            />
                          ) : null}
                          {!m.body && !m.gifUrl && (
                            <span className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className="text-[11px] font-mono text-muted-foreground dark:text-white/30">{timeAgo(m.createdAt)}</span>
                        </td>
                        <td className="px-4 py-3 hidden sm:table-cell">
                          <span className={`text-[11px] font-mono ${m.active ? "text-emerald-400/70" : "text-amber-400/70"}`}>
                            {chatExpiresInLabel(m.createdAt, chatData?.messageTtlMs)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDeleteChatMessage(m.id)}
                            disabled={chatDeleting === m.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground/80 dark:text-white/25 hover:text-red-400/70 transition-all disabled:opacity-40"
                            title="Delete message"
                          >
                            {chatDeleting === m.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
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
            <div className="rounded-xl border border-dashed border-border dark:border-white/12 p-5 flex flex-col gap-4">
              <p className="text-[11px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest">New Announcement</p>

              {/* Severity + Title */}
              <div className="flex gap-2">
                <select
                  value={annForm.severity}
                  onChange={(e) => setAnnForm((f) => ({ ...f, severity: e.target.value as Announcement["severity"] }))}
                  className="shrink-0 bg-black border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-[11px] font-mono rounded-lg px-2 py-2 focus:outline-none focus:border-border dark:border-white/30"
                >
                  {Object.entries(SEVERITY_META).map(([k, v]) => (
                    <option key={k} value={k} className="bg-black">{v.label}</option>
                  ))}
                </select>
                <input
                  value={annForm.title}
                  onChange={(e) => setAnnForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Title (required)"
                  className="flex-1 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                />
              </div>

              {/* Body */}
              <textarea
                value={annForm.body}
                onChange={(e) => setAnnForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Body text (optional)"
                rows={2}
                className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors resize-none"
              />

              {/* Link */}
              <div className="flex gap-2">
                <input
                  value={annForm.linkUrl}
                  onChange={(e) => setAnnForm((f) => ({ ...f, linkUrl: e.target.value }))}
                  placeholder="Link URL (optional)"
                  className="flex-1 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                />
                <input
                  value={annForm.linkLabel}
                  onChange={(e) => setAnnForm((f) => ({ ...f, linkLabel: e.target.value }))}
                  placeholder="Button label"
                  className="w-36 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Starts (optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={annForm.startsAt}
                    onChange={(e) => setAnnForm((f) => ({ ...f, startsAt: e.target.value }))}
                    className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Ends (optional)
                  </span>
                  <input
                    type="datetime-local"
                    value={annForm.endsAt}
                    onChange={(e) => setAnnForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
                  />
                </label>
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
                  <span className="text-[12px] text-muted-foreground dark:text-white/45 font-mono">Dismissible</span>
                </label>
                <button
                  onClick={handleCreateAnn}
                  disabled={!annForm.title.trim() || annCreating}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-sm font-semibold hover:bg-white/18 hover:text-foreground dark:text-white disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                >
                  {annCreating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Publish
                </button>
              </div>
            </div>

            {/* List */}
            {annsLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground/80 dark:text-white/25">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm font-mono">Loading…</span>
              </div>
            ) : anns.length === 0 ? (
              <p className="text-sm font-mono text-muted-foreground/70 dark:text-white/20 py-4">No announcements yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {anns.map((a) => {
                  const meta = SEVERITY_META[a.severity] ?? SEVERITY_META.info;
                  const SevIcon = meta.icon;
                  return (
                    <div
                      key={a.id}
                      className={`rounded-xl border px-4 py-4 flex flex-col gap-2 transition-opacity ${a.isActive ? "border-border dark:border-white/12 bg-muted/30 dark:bg-white/[0.02]" : "border-border dark:border-white/6 bg-muted/10 dark:bg-white/[0.01] opacity-50"}`}
                    >
                      <div className="flex items-start gap-3">
                        <SevIcon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: meta.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[13px] font-semibold text-foreground dark:text-white/85 truncate">{a.title}</span>
                            <span
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded-md border"
                              style={{ color: meta.color, borderColor: `${meta.color}40`, backgroundColor: `${meta.color}10` }}
                            >
                              {meta.label}
                            </span>
                            {!a.dismissible && (
                              <span className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 border border-border dark:border-white/10 px-1.5 py-0.5 rounded-md">pinned</span>
                            )}
                            {!a.isActive && (
                              <span className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/20 border border-border dark:border-white/8 px-1.5 py-0.5 rounded-md">inactive</span>
                            )}
                          </div>
                          {a.body && <p className="text-[12px] text-muted-foreground dark:text-white/45 mt-1 line-clamp-2">{a.body}</p>}
                          {a.linkUrl && (
                            <a
                              href={a.linkUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:text-white/60 mt-1 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {a.linkLabel ?? a.linkUrl}
                            </a>
                          )}
                          {(a.startsAt || a.endsAt) && (
                            <p className="text-[10px] font-mono text-muted-foreground/70 dark:text-white/25 mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {a.startsAt ? new Date(a.startsAt).toLocaleString() : "Anytime"}
                              {" → "}
                              {a.endsAt ? new Date(a.endsAt).toLocaleString() : "No end"}
                            </p>
                          )}
                          {a.forumThreadId && (
                            <Link
                              href={`/forum/${a.forumThreadId}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 text-[11px] text-violet-300/70 hover:text-violet-200 mt-1 transition-colors"
                            >
                              <MessageCircle className="w-3 h-3" />
                              Forum thread linked
                            </Link>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          <button
                            onClick={() => openEditAnn(a)}
                            title="Edit"
                            className="p-1.5 rounded-lg hover:bg-accent dark:bg-white/10 text-muted-foreground/80 dark:text-white/25 hover:text-muted-foreground dark:text-white/70 transition-all"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handlePostAnnToForum(a.id)}
                            disabled={annPosting === a.id}
                            title="Post to forum"
                            className="px-2 py-1 rounded-lg text-[11px] font-mono border border-violet-500/20 text-violet-300/70 hover:bg-violet-500/10 disabled:opacity-40 transition-all"
                          >
                            {annPosting === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Forum"}
                          </button>
                          <button
                            onClick={() => handleToggleAnn(a.id, a.isActive)}
                            disabled={annToggling === a.id}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all disabled:opacity-40 ${
                              a.isActive
                                ? "border-border dark:border-white/15 text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70 hover:border-border dark:border-white/25"
                                : "border-emerald-500/25 text-emerald-400/60 hover:text-emerald-300 hover:border-emerald-400/40"
                            }`}
                          >
                            {annToggling === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : (a.isActive ? "Deactivate" : "Activate")}
                          </button>
                          <button
                            onClick={() => handleDeleteAnn(a.id)}
                            disabled={annDeleting === a.id}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground/80 dark:text-white/25 hover:text-red-400/70 transition-all disabled:opacity-40"
                          >
                            {annDeleting === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      {a.createdAt && (
                        <p className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/15 pl-7">{timeAgo(a.createdAt)}</p>
                      )}
                      {editingAnn?.id === a.id && (
                        <div className="mt-3 ml-7 rounded-xl border border-border dark:border-white/10 bg-black/30 p-4 flex flex-col gap-3">
                          <p className="text-[10px] font-mono text-muted-foreground/80 dark:text-white/25 uppercase tracking-widest">Edit announcement</p>
                          <div className="flex gap-2">
                            <select
                              value={annEditForm.severity}
                              onChange={(e) => setAnnEditForm((f) => ({ ...f, severity: e.target.value as Announcement["severity"] }))}
                              className="shrink-0 bg-black border border-border dark:border-white/15 text-muted-foreground dark:text-white/70 text-[11px] font-mono rounded-lg px-2 py-2"
                            >
                              {Object.entries(SEVERITY_META).map(([k, v]) => (
                                <option key={k} value={k} className="bg-black">{v.label}</option>
                              ))}
                            </select>
                            <input
                              value={annEditForm.title}
                              onChange={(e) => setAnnEditForm((f) => ({ ...f, title: e.target.value }))}
                              className="flex-1 bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white"
                            />
                          </div>
                          <textarea
                            value={annEditForm.body}
                            onChange={(e) => setAnnEditForm((f) => ({ ...f, body: e.target.value }))}
                            rows={2}
                            className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white resize-none"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="datetime-local"
                              value={annEditForm.startsAt}
                              onChange={(e) => setAnnEditForm((f) => ({ ...f, startsAt: e.target.value }))}
                              className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white"
                            />
                            <input
                              type="datetime-local"
                              value={annEditForm.endsAt}
                              onChange={(e) => setAnnEditForm((f) => ({ ...f, endsAt: e.target.value }))}
                              className="bg-muted/50 dark:bg-white/[0.04] border border-border dark:border-white/12 rounded-lg px-3 py-2 text-sm text-foreground dark:text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              type="button"
                              onClick={() => setEditingAnn(null)}
                              className="px-3 py-1.5 rounded-lg text-[11px] font-mono text-muted-foreground dark:text-white/40 hover:text-muted-foreground dark:text-white/70"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveAnn()}
                              disabled={annSaving === a.id || !annEditForm.title.trim()}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-[11px] font-semibold disabled:opacity-40"
                            >
                              {annSaving === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                              Save changes
                            </button>
                          </div>
                        </div>
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
