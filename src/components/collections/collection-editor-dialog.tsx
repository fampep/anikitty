"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, Link2, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { withAuth } from "@/lib/auth/auth-fetch";
import { cn } from "@/lib/core/utils";
import { CollectionIconGlyph } from "./collection-icon";
import {
  COLLECTION_CATEGORIES,
  COLLECTION_CATEGORY_LABELS,
  COLLECTION_GRADIENTS,
  COLLECTION_ICONS,
  type CollectionCoverType,
  type CollectionSummary,
  type CollectionVisibility,
} from "@/lib/collections/collection-shared";

const VISIBILITIES: {
  id: CollectionVisibility;
  label: string;
  hint: string;
  Icon: typeof Lock;
}[] = [
  { id: "private", label: "Private", hint: "Only you (and collaborators) can see it", Icon: Lock },
  { id: "unlisted", label: "Unlisted", hint: "Anyone with the link, hidden from browsing", Icon: Link2 },
  { id: "public", label: "Public", hint: "Discoverable by everyone", Icon: Globe },
];

const COVER_TYPES: { id: CollectionCoverType; label: string }[] = [
  { id: "collage", label: "Poster collage" },
  { id: "gradient", label: "Gradient" },
  { id: "solid", label: "Solid colour" },
  { id: "image", label: "Image URL" },
];

type Props = {
  open: boolean;
  /** Present when editing; omit to create. */
  collection?: CollectionSummary | null;
  onClose: () => void;
  onSaved: (result: { id: string; slug: string }) => void;
};

export function CollectionEditorDialog({ open, collection, onClose, onSaved }: Props) {
  const editing = !!collection;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<CollectionVisibility>("private");
  const [category, setCategory] = useState<string | null>(null);
  const [coverType, setCoverType] = useState<CollectionCoverType>("collage");
  const [coverValue, setCoverValue] = useState<string>("sunset");
  const [icon, setIcon] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Reload the form whenever the dialog opens so a cancelled edit doesn't
  // leak into the next one.
  useEffect(() => {
    if (!open) return;
    setTitle(collection?.title ?? "");
    setDescription(collection?.description ?? "");
    setVisibility(collection?.visibility ?? "private");
    setCategory(collection?.category ?? null);
    setCoverType(collection?.coverType ?? "collage");
    setCoverValue(collection?.coverValue ?? "sunset");
    setIcon(collection?.icon ?? null);
    setTagInput((collection?.tags ?? []).join(", "));
    setSaving(false);
  }, [open, collection]);

  const submit = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      const body = {
        title: trimmed,
        description: description.trim(),
        visibility,
        category,
        coverType,
        coverValue: coverType === "collage" ? null : coverValue,
        icon,
        tags: tagInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 10),
      };

      const res = await fetch(
        editing ? `/api/collections/${collection!.id}` : "/api/collections",
        withAuth({
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Failed to save");

      toast.success(editing ? "Collection updated" : "Collection created");
      onSaved(
        editing
          ? { id: collection!.id, slug: data?.collection?.slug ?? collection!.slug }
          : { id: data.id, slug: data.slug },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !saving) onClose(); }}>
      <DialogContent className="max-h-[88vh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-[#09090b] p-0 shadow-2xl shadow-black/30 dark:border-white/10 [&>button:last-child]:hidden">
        <DialogHeader className="space-y-1.5 border-b border-border px-5 pb-4 pt-5 text-left dark:border-white/8">
          <DialogTitle className="text-base font-semibold tracking-tight text-foreground dark:text-white">
            {editing ? "Edit collection" : "New collection"}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground dark:text-white/45">
            Curate a list of anime, then share it or keep it to yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              disabled={saving}
              placeholder="Best Romance Anime"
              className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={2000}
              disabled={saving}
              placeholder="What ties this list together?"
              className="w-full resize-none rounded-xl border border-border bg-muted/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/30"
            />
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Visibility
            </span>
            <div className="space-y-1.5">
              {VISIBILITIES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisibility(v.id)}
                  disabled={saving}
                  aria-pressed={visibility === v.id}
                  className={cn(
                    "flex w-full items-start gap-2.5 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:opacity-40",
                    visibility === v.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border hover:border-border dark:border-white/8 dark:hover:border-white/20",
                  )}
                >
                  <v.Icon
                    className={cn(
                      "mt-0.5 h-3.5 w-3.5 shrink-0",
                      visibility === v.id ? "text-primary" : "text-muted-foreground dark:text-white/35",
                    )}
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block text-xs font-semibold",
                        visibility === v.id ? "text-primary" : "text-foreground dark:text-white/80",
                      )}
                    >
                      {v.label}
                    </span>
                    <span className="block text-[11px] text-muted-foreground dark:text-white/35">
                      {v.hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Category
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COLLECTION_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory((prev) => (prev === c ? null : c))}
                  disabled={saving}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:opacity-40",
                    category === c
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground dark:text-white/30 dark:hover:text-white/60",
                  )}
                >
                  {COLLECTION_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Icon
            </span>
            <div className="flex flex-wrap gap-1.5">
              {COLLECTION_ICONS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setIcon((prev) => (prev === name ? null : name))}
                  disabled={saving}
                  aria-label={name}
                  aria-pressed={icon === name}
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-lg border transition-colors disabled:opacity-40",
                    icon === name
                      ? "border-primary/40 bg-primary/15 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground dark:border-white/8 dark:text-white/35 dark:hover:text-white/70",
                  )}
                >
                  <CollectionIconGlyph name={name} className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Cover
            </span>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {COVER_TYPES.map((ct) => (
                <button
                  key={ct.id}
                  type="button"
                  onClick={() => setCoverType(ct.id)}
                  disabled={saving}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-40",
                    coverType === ct.id
                      ? "bg-accent text-foreground dark:bg-white/12 dark:text-white"
                      : "text-muted-foreground hover:text-foreground dark:text-white/30 dark:hover:text-white/60",
                  )}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            {coverType === "gradient" && (
              <div className="flex flex-wrap gap-2">
                {COLLECTION_GRADIENTS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setCoverValue(g.id)}
                    disabled={saving}
                    aria-label={g.label}
                    aria-pressed={coverValue === g.id}
                    className={cn(
                      "h-8 w-12 rounded-lg ring-offset-2 ring-offset-[#09090b] transition-all disabled:opacity-40",
                      coverValue === g.id ? "ring-2 ring-primary" : "ring-1 ring-white/10",
                    )}
                    style={{ background: g.css }}
                  />
                ))}
              </div>
            )}

            {coverType === "solid" && (
              <input
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(coverValue) ? coverValue : "#18181b"}
                onChange={(e) => setCoverValue(e.target.value)}
                disabled={saving}
                className="h-9 w-16 cursor-pointer rounded-lg border border-border bg-transparent dark:border-white/10"
              />
            )}

            {coverType === "image" && (
              <input
                value={coverValue}
                onChange={(e) => setCoverValue(e.target.value)}
                disabled={saving}
                placeholder="https://…"
                className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/30"
              />
            )}

            {coverType === "collage" && (
              <p className="text-[11px] text-muted-foreground dark:text-white/30">
                Built automatically from the first four posters in the list.
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold text-muted-foreground dark:text-white/50">
              Tags
            </label>
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              disabled={saving}
              placeholder="cozy, winter, comfort"
              className="w-full rounded-xl border border-border bg-muted/60 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 disabled:opacity-50 dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-white/30"
            />
            <p className="mt-1 text-[11px] text-muted-foreground dark:text-white/25">
              Comma separated, up to 10.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border px-5 py-4 sm:justify-end sm:gap-2 dark:border-white/8">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:opacity-40 dark:border-white/10 dark:bg-white/5 dark:text-white/65 dark:hover:text-white/85"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving || !title.trim()}
            className="rounded-xl bg-primary/15 px-4 py-2 text-xs font-bold text-primary ring-1 ring-primary/25 transition-colors hover:bg-primary/25 disabled:opacity-40"
          >
            {saving ? "Saving…" : editing ? "Save changes" : "Create"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
