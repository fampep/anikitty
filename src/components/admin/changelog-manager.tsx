"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/core/utils";
import {
  CHANGELOG_CATEGORIES,
  CHANGELOG_CATEGORY_META,
  type ChangelogCategory,
  type ChangelogItem,
} from "@/lib/changelog/changelog-shared";

const ADMIN_TOKEN_KEY = "adminToken";
function adminHeaders(): Record<string, string> {
  const token = typeof window === "undefined" ? null : sessionStorage.getItem(ADMIN_TOKEN_KEY);
  return { "X-Admin-Token": token ?? "", "Content-Type": "application/json" };
}

type Entry = {
  id: string;
  version: string;
  slug: string;
  title: string | null;
  summary: string | null;
  items: ChangelogItem[];
  isFeatured: boolean;
  isPublished: boolean;
  releasedAt: string | null;
  createdAt: string;
};

const EMPTY_FORM = {
  id: null as string | null,
  version: "",
  slug: "",
  title: "",
  summary: "",
  items: [] as ChangelogItem[],
  isFeatured: false,
  isPublished: false,
  releasedAt: new Date().toISOString().slice(0, 10),
};

export default function ChangelogManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [draftCategory, setDraftCategory] = useState<ChangelogCategory>("new");
  const [draftText, setDraftText] = useState("");

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/changelog", { headers: adminHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEntries(data.entries ?? []);
    } catch {
      toast.error("Failed to load changelog entries");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEntries();
  }, [fetchEntries]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setDraftText("");
  };

  const startEdit = (entry: Entry) => {
    setForm({
      id: entry.id,
      version: entry.version,
      slug: entry.slug,
      title: entry.title ?? "",
      summary: entry.summary ?? "",
      items: entry.items,
      isFeatured: entry.isFeatured,
      isPublished: entry.isPublished,
      releasedAt: entry.releasedAt ? entry.releasedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
    });
  };

  const addItem = () => {
    if (!draftText.trim()) return;
    setForm((f) => ({
      ...f,
      items: [...f.items, { category: draftCategory, text: draftText.trim() }],
    }));
    setDraftText("");
  };

  const removeItem = (idx: number) => {
    setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const save = async () => {
    if (!form.version.trim()) {
      toast.error("Version is required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        version: form.version.trim(),
        slug: form.slug.trim() || undefined,
        title: form.title.trim() || null,
        summary: form.summary.trim() || null,
        items: form.items,
        isFeatured: form.isFeatured,
        isPublished: form.isPublished,
        releasedAt: form.releasedAt ? new Date(form.releasedAt).toISOString() : undefined,
      };
      const res = await fetch("/api/admin/changelog", {
        method: form.id ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Save failed");
      }
      toast.success(form.id ? "Entry updated" : "Entry created");
      resetForm();
      void fetchEntries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this changelog entry?")) return;
    try {
      const res = await fetch("/api/admin/changelog", {
        method: "DELETE",
        headers: adminHeaders(),
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Entry deleted");
      void fetchEntries();
    } catch {
      toast.error("Delete failed");
    }
  };

  const togglePublished = async (entry: Entry) => {
    try {
      const res = await fetch("/api/admin/changelog", {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ id: entry.id, isPublished: !entry.isPublished }),
      });
      if (!res.ok) throw new Error();
      void fetchEntries();
    } catch {
      toast.error("Update failed");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Form */}
      <div className="rounded-xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] p-4 sm:p-5">
        <p className="mb-3 text-sm font-semibold text-foreground dark:text-white">
          {form.id ? "Edit entry" : "New entry"}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            placeholder="Version (e.g. 2.5.0)"
            className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30"
          />
          <input
            value={form.slug}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder="Slug (optional, defaults to version)"
            className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30"
          />
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title (optional)"
            className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 sm:col-span-2"
          />
          <textarea
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            placeholder="Summary (optional)"
            rows={2}
            className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-3 py-2 text-sm text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30 sm:col-span-2"
          />
          <input
            type="date"
            value={form.releasedAt}
            onChange={(e) => setForm((f) => ({ ...f, releasedAt: e.target.value }))}
            className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-3 py-2 text-sm text-foreground dark:text-white"
          />
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-foreground/80 dark:text-white/70">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))}
              />
              Featured
            </label>
            <label className="flex items-center gap-1.5 text-xs text-foreground/80 dark:text-white/70">
              <input
                type="checkbox"
                checked={form.isPublished}
                onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
              />
              Published
            </label>
          </div>
        </div>

        {/* Items */}
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-white/45">
            Items
          </p>
          <div className="flex flex-col gap-1.5">
            {form.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 rounded-lg border border-border dark:border-white/8 bg-background dark:bg-white/[0.02] px-2.5 py-1.5"
              >
                <span className="shrink-0 text-xs">
                  {CHANGELOG_CATEGORY_META[item.category].emoji}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-foreground/85 dark:text-white/75">
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="shrink-0 text-muted-foreground dark:text-white/30 hover:text-rose-400"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value as ChangelogCategory)}
              className="rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-2 py-1.5 text-xs text-foreground dark:text-white"
            >
              {CHANGELOG_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CHANGELOG_CATEGORY_META[c].emoji} {CHANGELOG_CATEGORY_META[c].label}
                </option>
              ))}
            </select>
            <input
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addItem();
                }
              }}
              placeholder="Item text…"
              className="min-w-0 flex-1 rounded-lg border border-border dark:border-white/10 bg-background dark:bg-white/[0.04] px-2.5 py-1.5 text-xs text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-white/30"
            />
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-400/40 bg-teal-500/15 px-2.5 py-1.5 text-xs font-bold text-teal-200 hover:bg-teal-500/25"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/15 px-3 py-1.5 text-sm font-bold text-foreground dark:text-white hover:bg-primary/25 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {form.id ? "Save changes" : "Create entry"}
          </button>
          {form.id ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-border dark:border-white/10 px-3 py-1.5 text-sm text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground dark:text-white/40" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/40">
          No changelog entries yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border border-border dark:border-white/10 bg-card dark:bg-white/[0.03] px-3.5 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-foreground dark:text-white">
                    v{entry.version}
                  </span>
                  {entry.isFeatured ? (
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ) : null}
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      entry.isPublished
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-500/15 text-zinc-400",
                    )}
                  >
                    {entry.isPublished ? "Published" : "Draft"}
                  </span>
                  <span className="text-[11px] text-muted-foreground dark:text-white/35">
                    {entry.items.length} items
                  </span>
                </div>
                {entry.title ? (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground dark:text-white/50">
                    {entry.title}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => togglePublished(entry)}
                className="shrink-0 rounded-lg border border-border dark:border-white/10 px-2 py-1 text-[11px] font-semibold text-muted-foreground dark:text-white/60 hover:text-foreground dark:hover:text-white"
              >
                {entry.isPublished ? "Unpublish" : "Publish"}
              </button>
              <button
                type="button"
                onClick={() => startEdit(entry)}
                className="shrink-0 text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white"
                aria-label="Edit"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                className="shrink-0 text-muted-foreground dark:text-white/40 hover:text-rose-400"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
