"use client";

import { AniKittyPlayer as KittyPlayer } from "@/components/kittyplayer";

/** Public sample MP4 for UI work (progressive). Native HLS works in Safari only. */
const DEMO_MP4 =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

export default function KittyPlayerDemoPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Dev playground
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          KittyPlayer
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Standalone HTML5 player used on the production watch page. Demo source is
          progressive MP4. Watch streams use the same component with hls.js /
          native HLS (Safari), stream sniffing for extensionless playlists,
          plus captions / quality / audio in settings, Cast, and skip ticks.
        </p>
      </header>

      <KittyPlayer
        src={DEMO_MP4}
        title="Big Buck Bunny (demo)"
        className="shadow-lg shadow-black/40 ring-1 ring-white/10"
        skipTimes={{
          intro: { start: 12, end: 45 },
          outro: { start: 540, end: 580 },
        }}
      />

      <section className="rounded-lg border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
        <h2 className="mb-2 font-medium text-foreground">Keyboard</h2>
        <ul className="grid gap-1 sm:grid-cols-2">
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">Space</kbd> /{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">K</kbd> — play/pause
          </li>
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">←</kbd> /{" "}
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">→</kbd> — seek
          </li>
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">F</kbd> — fullscreen
          </li>
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">M</kbd> — mute
          </li>
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">C</kbd> — captions
          </li>
          <li>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">?</kbd> — shortcuts
          </li>
        </ul>
      </section>
    </main>
  );
}
