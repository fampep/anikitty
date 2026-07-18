"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, ImageIcon, Palette, Sparkles, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/oauth/anisurge";
import { THEME_COLOR_PRESETS, isValidThemeColor } from "@/lib/core/theme-color";
import { MEDIA_URL_HINT } from "@/lib/core/media-url";
import { withAuth } from "@/lib/auth/auth-fetch";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import ImageCropper from "@/components/common/image-cropper";
import { cn } from "@/lib/core/utils";
import { PROFILE_BBCODE_HINT, PROFILE_BIO_MAX_LENGTH } from "@/lib/text/bbcode";
import ProfileBioContent from "@/components/profile/profile-bio-content";
import { useT } from "@/providers/i18n-provider";

type MediaKind = "avatar" | "banner";

export type ProfileCustomizationValues = {
  avatarUrl: string;
  bannerUrl: string;
  bio: string;
  themeColor: string | null;
};

type Props = {
  initial: ProfileCustomizationValues;
  onSaved: (values: ProfileCustomizationValues) => void;
  showBio?: boolean;
  compact?: boolean;
};

export default function ProfileCustomizationForm({
  initial,
  onSaved,
  showBio = true,
  compact = false,
}: Props) {
  const t = useT();
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [bio, setBio] = useState(initial.bio);
  const [themeColor, setThemeColor] = useState<string | null>(initial.themeColor);
  const [customColor, setCustomColor] = useState(initial.themeColor ?? "#a1a1aa");
  const [saving, setSaving] = useState(false);

  // Upload + crop state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickKindRef = useRef<MediaKind>("avatar");
  const [cropKind, setCropKind] = useState<MediaKind | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<MediaKind | null>(null);
  const [showUrl, setShowUrl] = useState<{ avatar: boolean; banner: boolean }>({
    avatar: false,
    banner: false,
  });

  const openPicker = (kind: MediaKind) => {
    pickKindRef.current = kind;
    fileInputRef.current?.click();
  };

  const MAX_UPLOAD = 4 * 1024 * 1024;

  const uploadMedia = async (blob: Blob, kind: MediaKind, filename: string) => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append(
        "file",
        blob instanceof File ? blob : new File([blob], filename, { type: blob.type }),
      );
      fd.append("kind", kind);
      const res = await fetch("/api/account/upload", withAuth({ method: "POST", body: fd }));
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Upload failed");
      if (kind === "avatar") setAvatarUrl(data.url);
      else setBannerUrl(data.url);
      toast.success("Image uploaded — click Save appearance to keep it");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    // Animated GIFs can't be cropped without losing the animation — upload the
    // original as-is so it stays animated (displayed center-cropped to fit).
    if (f.type === "image/gif") {
      if (f.size > MAX_UPLOAD) {
        toast.error("GIF is too large (max 4 MB)");
        return;
      }
      void uploadMedia(f, pickKindRef.current, f.name || "upload.gif");
      return;
    }
    setCropKind(pickKindRef.current);
    setCropFile(f);
  };

  const handleCropped = async (blob: Blob) => {
    const kind = cropKind ?? "avatar";
    setCropFile(null);
    setCropKind(null);
    await uploadMedia(blob, kind, `${kind}.webp`);
  };

  useEffect(() => {
    setAvatarUrl(initial.avatarUrl);
    setBannerUrl(initial.bannerUrl);
    setBio(initial.bio);
    setThemeColor(initial.themeColor);
    setCustomColor(initial.themeColor ?? "#a1a1aa");
  }, [initial]);

  const handleSave = async () => {
    const trimmedAvatar = avatarUrl.trim();
    const trimmedBanner = bannerUrl.trim();
    const color = themeColor;

    if (color && !isValidThemeColor(color)) {
      toast.error("Pick a valid theme color");
      return;
    }

    setSaving(true);
    try {
      await anisurgeAuth.updateProfile({
        avatarUrl: trimmedAvatar || null,
        bannerUrl: trimmedBanner || null,
        bio: bio.trim() || null,
        themeColor: color,
      });
      const saved: ProfileCustomizationValues = {
        avatarUrl: trimmedAvatar,
        bannerUrl: trimmedBanner,
        bio: bio.trim(),
        themeColor: color,
      };
      onSaved(saved);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-5", compact && "gap-4")}>
      {/* Theme color */}
      <div className="flex flex-col gap-2.5">
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Accent theme
        </label>
        <p className="text-[11px] text-muted-foreground dark:text-white/30 leading-relaxed">
          Personalize nav highlights and accents across the site.
        </p>
        <div className="flex flex-wrap gap-2">
          {THEME_COLOR_PRESETS.map((preset) => {
            const selected = (themeColor ?? "") === preset.hex;
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={selected}
                onClick={() => setThemeColor(preset.hex || null)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                  selected
                    ? "border-primary/50 bg-accent dark:border-white/35 dark:bg-white/10 text-foreground dark:text-white"
                    : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:border-border dark:hover:border-white/20 hover:text-foreground/80 dark:hover:text-white/70",
                )}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-border dark:border-white/20 shrink-0"
                  style={{
                    background: preset.hex
                      ? preset.hex
                      : "linear-gradient(135deg,#fff 0%,#666 100%)",
                  }}
                />
                {preset.name}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 pt-1">
          <input
            type="color"
            value={customColor}
            onChange={(e) => {
              setCustomColor(e.target.value);
              setThemeColor(e.target.value);
            }}
            className="w-10 h-10 rounded-lg border border-border dark:border-white/15 bg-transparent cursor-pointer shrink-0"
            aria-label="Custom accent color"
          />
          <span className="text-[11px] font-mono text-muted-foreground dark:text-white/30">Custom color picker</span>
        </div>
      </div>

      {/* Hidden shared file input for uploads */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onFileChange}
        className="hidden"
      />

      {/* Banner */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Profile banner
        </label>
        {bannerUrl.trim() && (
          <div className="relative h-24 md:h-28 rounded-xl overflow-hidden ring-1 ring-border dark:ring-white/10">
            <ProfileMediaPreview src={bannerUrl.trim()} alt="Banner preview" variant="banner" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openPicker("banner")}
            disabled={uploading === "banner"}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-foreground dark:text-white/90 text-xs font-semibold hover:bg-white/15 disabled:opacity-50 transition-all"
          >
            {uploading === "banner" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {bannerUrl.trim() ? "Change banner" : "Upload banner"}
          </button>
          <button
            type="button"
            onClick={() => setShowUrl((s) => ({ ...s, banner: !s.banner }))}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:hover:text-white/60 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5" />
            Paste link
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground/70 dark:text-white/25 font-mono">
          PNG, JPG or WebP open a crop tool · GIFs upload animated
        </p>
        {showUrl.banner && (
          <input
            value={bannerUrl}
            onChange={(e) => setBannerUrl(e.target.value)}
            placeholder={MEDIA_URL_HINT}
            className="w-full bg-muted/40 dark:bg-white/4 border border-border dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
          />
        )}
      </div>

      {/* Avatar */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Avatar
        </label>
        <div className="flex items-center gap-3">
          {avatarUrl.trim() && (
            <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/15 shrink-0">
              <ProfileMediaPreview src={avatarUrl.trim()} alt="Avatar preview" variant="avatar" />
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openPicker("avatar")}
                disabled={uploading === "avatar"}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent dark:bg-white/10 border border-border dark:border-white/15 text-foreground dark:text-white/90 text-xs font-semibold hover:bg-white/15 disabled:opacity-50 transition-all"
              >
                {uploading === "avatar" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                {avatarUrl.trim() ? "Change avatar" : "Upload avatar"}
              </button>
              <button
                type="button"
                onClick={() => setShowUrl((s) => ({ ...s, avatar: !s.avatar }))}
                className="inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium text-muted-foreground dark:text-white/35 hover:text-muted-foreground dark:hover:text-white/60 transition-colors"
              >
                <Link2 className="w-3.5 h-3.5" />
                Paste link
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/70 dark:text-white/25 font-mono">
              PNG, JPG or WebP open a crop tool · GIFs upload animated
            </p>
          </div>
        </div>
        {showUrl.avatar && (
          <input
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder={MEDIA_URL_HINT}
            className="w-full bg-muted/40 dark:bg-white/4 border border-border dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors"
          />
        )}
      </div>

      {/* Crop modal */}
      {cropFile && cropKind && (
        <ImageCropper
          file={cropFile}
          aspect={cropKind === "avatar" ? 1 : 4}
          outputWidth={cropKind === "avatar" ? 768 : 2048}
          circular={cropKind === "avatar"}
          title={cropKind === "avatar" ? "Adjust your avatar" : "Adjust your banner"}
          onCancel={() => {
            setCropFile(null);
            setCropKind(null);
          }}
          onConfirm={handleCropped}
        />
      )}

      {showBio && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono text-muted-foreground dark:text-white/40 uppercase tracking-widest">
            {t("profile.aboutMe")}
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, PROFILE_BIO_MAX_LENGTH))}
            placeholder={t("profile.bioPlaceholder")}
            rows={5}
            maxLength={PROFILE_BIO_MAX_LENGTH}
            className="w-full bg-muted/40 dark:bg-white/4 border border-border dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-foreground dark:text-white placeholder:text-muted-foreground/70 dark:placeholder:text-white/20 resize-y min-h-[120px] focus:outline-none focus:border-primary/40 dark:focus:border-white/25 transition-colors font-mono"
          />
          <p className="text-[10px] leading-relaxed text-muted-foreground/80 dark:text-white/30">
            {t("profile.bioBbcodeHint")}
          </p>
          <details className="rounded-lg border border-border/60 dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] px-3 py-2">
            <summary className="cursor-pointer text-[10px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/35">
              {t("profile.bioBbcodeTags")}
            </summary>
            <p className="mt-2 text-[10px] leading-relaxed font-mono text-muted-foreground/80 dark:text-white/30 break-all">
              {PROFILE_BBCODE_HINT}
            </p>
          </details>
          {bio.trim() && (
            <div className="rounded-xl border border-border dark:border-white/10 bg-muted/20 dark:bg-white/[0.02] px-4 py-3">
              <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground dark:text-white/30 mb-2">
                {t("profile.bioPreview")}
              </p>
              <ProfileBioContent bio={bio} />
            </div>
          )}
          <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-white/15 text-right">
            {bio.length}/{PROFILE_BIO_MAX_LENGTH}
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-accent dark:bg-white/12 border border-border dark:border-white/20 text-foreground dark:text-white text-sm font-semibold hover:bg-white/18 disabled:opacity-40 transition-all self-start"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save appearance
      </button>
    </div>
  );
}
