"use client";

import Container from "@/components/container";
import { useSettingsStore, EpisodeLayout } from "@/store/settings-store";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import {
  Settings,
  LayoutList,
  Grid2x2,
  LayoutGrid,
  Captions,
  Mic,
  Play,
  KeyRound,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EPISODE_LAYOUTS: {
  value: EpisodeLayout;
  label: string;
  description: string;
  icon: React.ReactNode;
  preview: React.ReactNode;
}[] = [
  {
    value: "list",
    label: "List",
    description: "Episode number + title in a scrollable list",
    icon: <LayoutList className="w-4 h-4" />,
    preview: (
      <div className="flex flex-col gap-1 w-full px-2 py-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="flex items-center gap-2 h-7 rounded-md bg-white/5 px-2">
            <span className="text-[9px] font-mono text-white/25 w-4">{n}</span>
            <div className="flex-1 h-1.5 rounded bg-white/10" />
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "compact",
    label: "Compact",
    description: "Number-only grid — great for long series",
    icon: <Grid2x2 className="w-4 h-4" />,
    preview: (
      <div className="grid grid-cols-4 gap-1 w-full px-2 py-1">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div key={n} className="h-7 rounded bg-white/5 flex items-center justify-center">
            <span className="text-[9px] font-mono text-white/25">{n}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    value: "thumbnail",
    label: "Thumbnail",
    description: "Poster-style cards showing episode artwork",
    icon: <LayoutGrid className="w-4 h-4" />,
    preview: (
      <div className="grid grid-cols-3 gap-1 w-full px-2 py-1">
        {[1, 2, 3].map((n) => (
          <div key={n} className="aspect-[16/9] rounded bg-white/5 relative overflow-hidden flex items-end p-1">
            <span className="text-[8px] font-mono text-white/40 bg-black/50 px-1 rounded">EP {n}</span>
          </div>
        ))}
      </div>
    ),
  },
];

function AdminClaimSection() {
  const { auth, setAuth } = useAuthStore();
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);

  if (!auth || auth.role === "admin") return null;

  const claim = async () => {
    if (!key.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("anisurgeToken") ?? ""}`,
        },
        body: JSON.stringify({ key: key.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      localStorage.setItem("anisurgeToken", data.token);
      setAuth({ ...auth, role: "admin" });
      toast.success("Admin access granted");
      setKey("");
    } catch (e: any) {
      toast.error(e.message ?? "Invalid key");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section>
      <SectionLabel
        icon={<KeyRound className="w-4 h-4" />}
        title="Admin Access"
        description="Enter the site admin key to gain elevated permissions"
      />
      <div className="mt-4 flex gap-2">
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && claim()}
          placeholder="Admin key…"
          className="flex-1 bg-white/4 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-white/25 transition-colors font-mono"
        />
        <button
          onClick={claim}
          disabled={loading || !key.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 text-white/70 text-sm font-medium hover:bg-white/14 disabled:opacity-35 transition-all"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          Claim
        </button>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const { episodeLayout, setEpisodeLayout, preferDub, setPreferDub, autoPlay, setAutoPlay } =
    useSettingsStore();

  return (
    <div className="min-h-screen bg-black pt-8 pb-24">
      <Container className="max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <Settings className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Settings</h1>
        </div>

        <div className="flex flex-col gap-8">
          {/* Episode layout */}
          <section>
            <SectionLabel
              icon={<LayoutList className="w-4 h-4" />}
              title="Episode List Layout"
              description="How episodes are displayed on the watch page"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {EPISODE_LAYOUTS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setEpisodeLayout(opt.value)}
                  className={cn(
                    "flex flex-col rounded-xl border transition-all duration-200 overflow-hidden text-left",
                    episodeLayout === opt.value
                      ? "border-white/40 bg-white/8 ring-1 ring-white/20"
                      : "border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/5",
                  )}
                >
                  {/* Preview */}
                  <div className="h-24 bg-black/30 flex items-center justify-center border-b border-white/6">
                    {opt.preview}
                  </div>
                  {/* Label */}
                  <div className="px-3 py-2.5 flex items-center gap-2">
                    <span className={episodeLayout === opt.value ? "text-white/70" : "text-white/30"}>
                      {opt.icon}
                    </span>
                    <div>
                      <p className={cn("text-sm font-semibold", episodeLayout === opt.value ? "text-white" : "text-white/55")}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-white/25 mt-0.5 font-mono">{opt.description}</p>
                    </div>
                    {episodeLayout === opt.value && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-white/60 shrink-0" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Playback preferences */}
          <section>
            <SectionLabel
              icon={<Play className="w-4 h-4" />}
              title="Playback"
              description="Default behaviour when watching anime"
            />
            <div className="mt-4 flex flex-col gap-3">
              <ToggleRow
                icon={<Mic className="w-4 h-4" />}
                label="Prefer Dub"
                description="Default to English dub when available"
                value={preferDub}
                onChange={setPreferDub}
              />
              <ToggleRow
                icon={<Play className="w-4 h-4" />}
                label="Auto-play next episode"
                description="Automatically play the next episode when one ends"
                value={autoPlay}
                onChange={setAutoPlay}
              />
            </div>
          </section>

          <AdminClaimSection />

          {/* Language indicator */}
          <section>
            <SectionLabel
              icon={<Captions className="w-4 h-4" />}
              title="Audio & Subtitles"
              description="Visual indicators on anime cards"
            />
            <div className="mt-4 p-4 rounded-xl bg-white/3 border border-white/8">
              <p className="text-sm text-white/50">
                Cards showing{" "}
                <span className="inline-flex items-center gap-0.5 bg-sky-500/15 text-sky-300 border border-sky-500/25 text-[10px] font-bold px-1.5 py-0.5 rounded mx-1">
                  <Captions className="h-2.5 w-2.5" /> 12
                </span>
                indicate subtitled episodes available. Cards with a{" "}
                <span className="inline-flex items-center gap-0.5 bg-purple-600/80 text-white text-[9px] font-black px-1.5 py-0.5 rounded mx-1">
                  DUB
                </span>
                badge have English dubbing.
              </p>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}

function SectionLabel({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 pb-2 border-b border-white/8">
      <span className="text-white/35 mt-0.5">{icon}</span>
      <div>
        <h2 className="text-base font-bold text-white/85">{title}</h2>
        <p className="text-[11px] text-white/30 font-mono mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  icon, label, description, value, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/3 border border-white/8 hover:border-white/14 transition-colors cursor-pointer"
      onClick={() => onChange(!value)}
    >
      <div className="flex items-center gap-3">
        <span className="text-white/30">{icon}</span>
        <div>
          <p className="text-sm font-medium text-white/75">{label}</p>
          <p className="text-[10px] text-white/25 font-mono mt-0.5">{description}</p>
        </div>
      </div>
      {/* Toggle */}
      <div
        className={cn(
          "relative w-10 h-5 rounded-full transition-colors duration-200 shrink-0",
          value ? "bg-white/60" : "bg-white/12",
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            value ? "translate-x-5" : "translate-x-0.5",
          )}
        />
      </div>
    </div>
  );
}
