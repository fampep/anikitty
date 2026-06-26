"use client";

import React, { useEffect, useState } from "react";
import { Loader2, ImageIcon, Palette, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { anisurgeAuth } from "@/lib/anisurge";
import { THEME_COLOR_PRESETS, isValidThemeColor } from "@/lib/theme-color";
import { AVATAR_EXAMPLE_HINT, BANNER_EXAMPLE_HINT, MEDIA_URL_HINT } from "@/lib/media-url";
import ProfileMediaPreview from "@/components/profile-media-preview";
import { cn } from "@/lib/utils";

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
  const [avatarUrl, setAvatarUrl] = useState(initial.avatarUrl);
  const [bannerUrl, setBannerUrl] = useState(initial.bannerUrl);
  const [bio, setBio] = useState(initial.bio);
  const [themeColor, setThemeColor] = useState<string | null>(initial.themeColor);
  const [customColor, setCustomColor] = useState(initial.themeColor ?? "#a78bfa");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setAvatarUrl(initial.avatarUrl);
    setBannerUrl(initial.bannerUrl);
    setBio(initial.bio);
    setThemeColor(initial.themeColor);
    setCustomColor(initial.themeColor ?? "#a78bfa");
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
        <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Accent theme
        </label>
        <p className="text-[11px] text-white/30 leading-relaxed">
          Personalize nav highlights and accents across the site.
        </p>
        <div className="flex flex-wrap gap-2">
          {THEME_COLOR_PRESETS.map((preset) => {
            const selected = (themeColor ?? "") === preset.hex;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => setThemeColor(preset.hex || null)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all",
                  selected
                    ? "border-white/35 bg-white/10 text-white"
                    : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/20 hover:text-white/70",
                )}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
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
            className="w-10 h-10 rounded-lg border border-white/15 bg-transparent cursor-pointer shrink-0"
            aria-label="Custom accent color"
          />
          <span className="text-[11px] font-mono text-white/30">Custom color picker</span>
        </div>
      </div>

      {/* Banner */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Profile banner
        </label>
        <p className="text-[10px] text-white/25 font-mono">{BANNER_EXAMPLE_HINT}</p>
        {bannerUrl.trim() && (
          <div className="relative h-24 md:h-28 rounded-xl overflow-hidden ring-1 ring-white/10">
            <ProfileMediaPreview src={bannerUrl.trim()} alt="Banner preview" variant="banner" />
          </div>
        )}
        <input
          value={bannerUrl}
          onChange={(e) => setBannerUrl(e.target.value)}
          placeholder={MEDIA_URL_HINT}
          className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
        />
      </div>

      {/* Avatar */}
      <div className="flex flex-col gap-2">
        <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Avatar / GIF
        </label>
        <p className="text-[10px] text-white/25 font-mono">{AVATAR_EXAMPLE_HINT}</p>
        {avatarUrl.trim() && (
          <div className="relative w-16 h-16 rounded-full overflow-hidden ring-2 ring-white/15 mb-1">
            <ProfileMediaPreview src={avatarUrl.trim()} alt="Avatar preview" variant="avatar" />
          </div>
        )}
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder={MEDIA_URL_HINT}
          className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors"
        />
      </div>

      {showBio && (
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-mono text-white/40 uppercase tracking-widest">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value.slice(0, 200))}
            placeholder="Tell everyone a little about yourself…"
            rows={3}
            maxLength={200}
            className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 resize-none focus:outline-none focus:border-white/25 transition-colors"
          />
          <span className="text-[10px] font-mono text-white/15 text-right">{bio.length}/200</span>
        </div>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white/12 border border-white/20 text-white text-sm font-semibold hover:bg-white/18 disabled:opacity-40 transition-all self-start"
      >
        {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Save appearance
      </button>
    </div>
  );
}
