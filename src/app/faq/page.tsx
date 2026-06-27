import type { ReactNode } from "react";
import Link from "next/link";
import Container from "@/components/container";
import { ROUTES } from "@/constants/routes";
import { formatChatTtlLabel, CHAT_MESSAGE_TTL_MS } from "@/lib/chat-config";
import {
  HelpCircle,
  Tv2,
  User,
  MessageSquare,
  Shield,
  Database,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

const chatTtlLabel = formatChatTtlLabel(CHAT_MESSAGE_TTL_MS);

type FaqItem = { q: string; a: ReactNode };
type FaqSection = { id: string; title: string; icon: React.ReactNode; items: FaqItem[] };

const SECTIONS: FaqSection[] = [
  {
    id: "basics",
    title: "Basics",
    icon: <HelpCircle className="w-4 h-4" />,
    items: [
      {
        q: "What is AniKitty?",
        a: (
          <>
            AniKitty is a free anime streaming site with no ads and no subscription paywall. You can
            browse the catalog, watch episodes (sub and dub where available), and join community
            features when signed in. AniKitty does not host video files on its own servers — streams
            are resolved through third-party sources (via{" "}
            <a
              href="https://kittyapi.buzz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-300 hover:text-violet-200 underline underline-offset-2"
            >
              KittyAPI
            </a>
            ).
          </>
        ),
      },
      {
        q: "Do I need an account?",
        a: (
          <>
            No — you can browse and watch without signing in. An account unlocks your watchlist,
            synced watch progress across devices, episode comments, forum posts, live chat, public
            profiles, XP/levels, optional AniList import, and settings like 2FA. Sign up from the
            login button in the navbar.
          </>
        ),
      },
      {
        q: "Is AniKitty really free?",
        a: "Yes. There are no ads on the player or site layout, and no paid tier. The site is supported as a community project (see GitHub and Discord links in the footer).",
      },
    ],
  },
  {
    id: "watching",
    title: "Watching anime",
    icon: <Tv2 className="w-4 h-4" />,
    items: [
      {
        q: "How does streaming work?",
        a: "When you open an episode, the player requests stream URLs through AniKitty’s backend, which talks to KittyAPI. You can switch sub/dub and providers where available from the watch page. Progress (current time in an episode) is saved to your account when logged in.",
      },
      {
        q: "What is Continue Watching?",
        a: (
          <>
            If you are signed in, the{" "}
            <Link href={ROUTES.HOME} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              home page
            </Link>{" "}
            shows titles you started recently so you can jump back in. Progress is stored in the
            database and also cached locally in your browser for faster resume.
          </>
        ),
      },
      {
        q: "Can I sync my list from AniList?",
        a: (
          <>
            Yes. In{" "}
            <Link href={ROUTES.SETTINGS} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Settings → Connected Accounts
            </Link>
            , connect AniList via OAuth. You can import your AniList library into your AniKitty
            watchlist. AniList access tokens are stored on your account so sync can run when you
            request it.
          </>
        ),
      },
      {
        q: "What are Schedule and Trending?",
        a: (
          <>
            <Link href={ROUTES.SCHEDULE} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Schedule
            </Link>{" "}
            shows what is airing this week in your local timezone.{" "}
            <Link href={ROUTES.TRENDING} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Trending
            </Link>{" "}
            highlights popular and upcoming titles from the catalog feed.
          </>
        ),
      },
    ],
  },
  {
    id: "account",
    title: "Account & profile",
    icon: <User className="w-4 h-4" />,
    items: [
      {
        q: "How do I create an account?",
        a: "Click Log in in the navbar, switch to Sign up, and enter a username (3–10 letters/numbers), email, and password. Your password is hashed before storage — AniKitty never saves plain-text passwords.",
      },
      {
        q: "What is on my public profile?",
        a: "Other users can see your avatar, banner, bio, role/level badges, watchlist lists, watch activity heatmap, and recent episode comments — unless you turn on Ninja mode (private profile) in Settings → Privacy.",
      },
      {
        q: "What is Ninja mode?",
        a: "Ninja mode hides your profile, watchlist, activity, and comments from everyone except you. Your username can still appear in live chat, forum, and episode comments — only the profile page is stealth.",
      },
      {
        q: "How do levels and XP work?",
        a: "XP comes from watching episodes (started and completed) and posting episode comments. Levels unlock display roles/tiers on your profile, chat, and forum. XP stats are computed from your watch progress and comment history in the database.",
      },
      {
        q: "Two-factor authentication (2FA)",
        a: "Optional TOTP (Google Authenticator, Authy, etc.) can be enabled under Settings → Security. When enabled, login requires your password plus a 6-digit code. Backup secrets are stored encrypted on the server.",
      },
      {
        q: "Active sessions",
        a: "Settings → Security lists devices where you are logged in (browser label, masked IP, last active). You can revoke individual sessions or log out everywhere. Each login creates a session row tied to your account.",
      },
    ],
  },
  {
    id: "community",
    title: "Community",
    icon: <MessageSquare className="w-4 h-4" />,
    items: [
      {
        q: "Live chat",
        a: (
          <>
            <Link href={ROUTES.CHAT} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Live chat
            </Link>{" "}
            is real-time and requires an account. Messages auto-delete after about {chatTtlLabel} to
            keep chat ephemeral. You can edit your own messages (double-click the text or press ↑ in
            an empty input) and delete your own messages; staff can remove any message.
          </>
        ),
      },
      {
        q: "Forum",
        a: (
          <>
            The{" "}
            <Link href={ROUTES.FORUM} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              forum
            </Link>{" "}
            is for longer discussions — threads and replies are stored until moderators or admins
            remove them. Usernames link to profiles when not in Ninja mode.
          </>
        ),
      },
      {
        q: "Episode comments",
        a: "On the watch page you can leave text (and optional GIF) comments per episode when signed in. Comments appear on the episode and on your profile’s comment history.",
      },
      {
        q: "Watch Together",
        a: (
          <>
            <Link href={ROUTES.WATCH_TOGETHER} className="text-violet-300 hover:text-violet-200 underline underline-offset-2">
              Watch Together
            </Link>{" "}
            lets a host create a room code so friends sync the same episode. Room chat and playback
            state are tied to the room while it is active.
          </>
        ),
      },
      {
        q: "What does the online counter mean?",
        a: "The “X online” badge counts anonymous browser sessions that sent a heartbeat in the last ~90 seconds. It is not a list of logged-in usernames — each tab gets a random ID in session storage. This count is kept in server memory only and is not stored in the database.",
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & data collection",
    icon: <Database className="w-4 h-4" />,
    items: [
      {
        q: "What data does AniKitty store about me?",
        a: (
          <ul className="list-disc pl-5 space-y-2 marker:text-white/25">
            <li>
              <strong className="text-white/75 font-medium">Account:</strong> username, email,
              password hash, optional avatar/banner/bio/theme color, role, 2FA secret (encrypted if
              enabled), optional AniList username and access token if you connect AniList.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Watch data:</strong> watchlist entries,
              per-episode progress (time, episode, language), titles/thumbnails cached with those
              rows, optional AniList sync timestamps.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Community:</strong> live chat messages
              (temporary), forum threads/posts, episode comments (text + optional GIF URL).
            </li>
            <li>
              <strong className="text-white/75 font-medium">Sessions:</strong> login session ID,
              browser user-agent, device label, masked IP address, last active time — for the active
              sessions list and security.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Preferences:</strong> profile private
              (Ninja mode) flag, player/settings choices stored server-side where applicable.
            </li>
          </ul>
        ),
      },
      {
        q: "What is stored only in my browser?",
        a: (
          <ul className="list-disc pl-5 space-y-2 marker:text-white/25">
            <li>
              <strong className="text-white/75 font-medium">Auth token</strong> (localStorage) — keeps
              you signed in until logout or expiry.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Player & UI settings</strong> — e.g. dub
              preference, episode layout, provider choice, dismissed announcements.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Progress cache</strong> — local copy of
              watch progress for faster resume.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Online heartbeat ID</strong>{" "}
              (sessionStorage) — random UUID for the public online counter, not linked to your
              account.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Level stats cache</strong>{" "}
              (sessionStorage) — temporary cache to avoid refetching XP on every page.
            </li>
          </ul>
        ),
      },
      {
        q: "Analytics and third parties",
        a: (
          <ul className="list-disc pl-5 space-y-2 marker:text-white/25">
            <li>
              <strong className="text-white/75 font-medium">Google Analytics</strong> (G-X9RZ58XPH1) —
              page views and usage metrics via gtag.js. Google may set its own cookies per their
              policy.
            </li>
            <li>
              <strong className="text-white/75 font-medium">KittyAPI</strong> — stream lookup; your
              IP is visible to that service when streams are requested.
            </li>
            <li>
              <strong className="text-white/75 font-medium">AniList</strong> — only if you choose to
              connect; OAuth tokens are used to read/import your list.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Anisurge</strong> — account signup/login
              may sync identity with the Anisurge BFF during registration.
            </li>
            <li>
              <strong className="text-white/75 font-medium">Discord / GitHub</strong> — external
              community links only; no data shared automatically.
            </li>
          </ul>
        ),
      },
      {
        q: "What we do not do",
        a: "AniKitty does not run third-party ad networks on the site, does not sell your personal data, and does not host video files on AniKitty servers. Moderators/admins can remove community content and manage users for site safety.",
      },
      {
        q: "How can I delete my data?",
        a: "There is no self-serve account deletion UI yet. You can revoke sessions, disconnect AniList, enable Ninja mode, and delete your chat messages. For full account removal, contact the team on Discord (link in footer) or open an issue on GitHub.",
      },
      {
        q: "Cookies",
        a: "Sign-in uses browser localStorage for the session token rather than a classic session cookie. Google Analytics may use cookies. Essential security headers (CSP, HSTS in production) apply site-wide.",
      },
    ],
  },
  {
    id: "security",
    title: "Security & moderation",
    icon: <Shield className="w-4 h-4" />,
    items: [
      {
        q: "How is my password protected?",
        a: "Passwords are hashed with bcrypt before being stored. Login uses signed JWT tokens with a server secret (and separate admin secrets for the admin panel). Production requires strong JWT and admin secrets configured in environment variables.",
      },
      {
        q: "Rate limiting",
        a: "Sensitive actions (signup, login, 2FA, chat, comments, imports) are rate-limited by IP and/or user ID to reduce abuse.",
      },
      {
        q: "Moderation",
        a: "Admins and moderators can manage forum content, live chat, and user roles. Community rules are enforced manually — report issues on Discord.",
      },
    ],
  },
];

function FaqBlock({ item }: { item: FaqItem }) {
  return (
    <details className="group site-panel overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-semibold text-white/85 hover:bg-white/[0.03] transition-colors [&::-webkit-details-marker]:hidden">
        <span>{item.q}</span>
        <span className="text-white/25 text-lg leading-none group-open:rotate-45 transition-transform shrink-0">
          +
        </span>
      </summary>
      <div className="px-5 pb-4 pt-0 text-sm text-white/50 leading-relaxed border-t border-white/[0.06]">
        <div className="pt-3">{item.a}</div>
      </div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="max-w-3xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-white/35 shrink-0" />
          <HelpCircle className="w-5 h-5 text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            FAQ
          </h1>
        </div>
        <p className="text-sm text-white/35 font-mono ml-[1.375rem] pl-8 mb-10 max-w-2xl leading-relaxed">
          How AniKitty works, what features need an account, and what data the site collects.
          Last updated {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}.
        </p>

        {/* Quick links */}
        <nav className="flex flex-wrap gap-2 mb-10">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/[0.03] text-white/45 hover:text-white/80 hover:border-white/20 transition-colors"
            >
              {s.icon}
              {s.title}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-12">
          {SECTIONS.map((section) => (
            <section key={section.id} id={section.id} className="scroll-mt-24">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-violet-400/70">{section.icon}</span>
                <h2 className="text-lg font-bold text-white/90">{section.title}</h2>
              </div>
              <div className="flex flex-col gap-2">
                {section.items.map((item) => (
                  <FaqBlock key={item.q} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className={cn("mt-14 site-panel p-5 sm:p-6")}>
          <p className="text-sm font-semibold text-white/80 mb-2">Still have questions?</p>
          <p className="text-sm text-white/45 leading-relaxed mb-4">
            Join the Discord community or open an issue on GitHub. For account-specific requests
            (deletion, privacy), contact moderators there.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="https://discord.gg/AWpSHbEDZ2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/12 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors"
            >
              Discord
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <a
              href="https://github.com/fampep/anikitty"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/12 text-sm text-white/70 hover:bg-white/8 hover:text-white transition-colors"
            >
              GitHub
              <ExternalLink className="w-3.5 h-3.5 opacity-50" />
            </a>
            <Link
              href={ROUTES.SETTINGS}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600/20 border border-violet-400/25 text-sm text-violet-200 hover:bg-violet-600/30 transition-colors"
            >
              Account settings
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

export const metadata = {
  title: "FAQ | AniKitty",
  description:
    "Frequently asked questions about AniKitty — streaming, accounts, community features, and data collection.",
};
