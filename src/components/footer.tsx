import React from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";
import { Flame, CalendarDays, Search } from "lucide-react";

const KITTY_ICON = "/jiji.jpg";

const Footer = () => {
  return (
    <footer className="w-full bg-black mt-10 relative overflow-hidden">
      {/* Top fade */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="max-w-screen-xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-10 border-b border-white/6">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 rounded-full overflow-hidden ring-1 ring-white/12">
                <Image src={KITTY_ICON} alt="AniKitty" fill className="object-cover object-top" unoptimized />
              </div>
              <p className="text-base font-bold text-white/90 tracking-widest">AniKitty</p>
            </div>
            <p className="text-[11px] text-white/20 font-mono leading-relaxed max-w-[180px]">
              Free anime streaming. No ads. No limits.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <a
                href="https://github.com/fampep/anikitty"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all"
              >
                <GitHubLogoIcon width="14" height="14" />
              </a>
              <a
                href="https://discord.gg/AWpSHbEDZ2"
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg border border-white/10 text-white/30 hover:text-white/70 hover:border-white/25 transition-all"
              >
                <DiscordLogoIcon width="14" height="14" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Browse</p>
            <NavLink href="/" label="Home" />
            <NavLink href="/search" label="Search" icon={<Search className="w-3 h-3" />} />
            <NavLink href="/trending" label="Trending" icon={<Flame className="w-3 h-3" />} />
            <NavLink href="/schedule" label="Schedule" icon={<CalendarDays className="w-3 h-3" />} />
          </div>

          {/* Account */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Account</p>
            <NavLink href="/login" label="Sign In" />
            <NavLink href="/settings" label="Settings" />
            <a
              href="https://anisurge.me"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              Anisurge ↗
            </a>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-3">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest">Project</p>
            <a
              href="https://github.com/fampep/anikitty"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              <GitHubLogoIcon width="13" height="13" />
              GitHub
            </a>
            <a
              href="https://discord.gg/AWpSHbEDZ2"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              <DiscordLogoIcon width="13" height="13" />
              Discord
            </a>
            <a
              href="https://kittyapi.buzz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-white/35 hover:text-white/65 transition-colors"
            >
              KittyAPI ↗
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/18 text-center sm:text-left leading-relaxed max-w-lg">
            AniKitty does not store any files on its servers. All content is provided by third-party services.
          </p>
          <p className="text-[11px] text-white/15 shrink-0 font-mono">
            © {new Date().getFullYear()} anikitty.moe
          </p>
        </div>
      </div>
    </footer>
  );
};

function NavLink({ href, label, icon }: { href: string; label: string; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white/65 transition-colors">
      {icon && <span className="text-white/20">{icon}</span>}
      {label}
    </Link>
  );
}

export default Footer;
