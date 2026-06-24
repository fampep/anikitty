import React from "react";
import Image from "next/image";
import Link from "next/link";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

const KITTY_ICON = "/jiji.jpg";

const Footer = () => {
  return (
    <footer className="w-full bg-black border-t border-white/8 mt-6">
      <div className="max-w-screen-xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8">

          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/15">
                <Image src={KITTY_ICON} alt="KittyAnime" fill className="object-cover object-top" unoptimized />
              </div>
              <p className="text-lg font-bold text-white/90 tracking-widest">KittyAnime</p>
            </div>
            <p className="text-[11px] text-white/25 font-mono tracking-widest">~ nya ~</p>
          </div>

          {/* Nav links */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Navigate</p>
            <Link href="/" className="text-sm text-white/45 hover:text-white/80 transition-colors">Home</Link>
            <Link href="/search" className="text-sm text-white/45 hover:text-white/80 transition-colors">Search</Link>
          </div>

          {/* Links */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <p className="text-[10px] font-mono text-white/25 uppercase tracking-widest mb-1">Links</p>
            <a
              href="https://github.com/Dovakiin0/Kitsune"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/45 hover:text-white/80 transition-colors"
            >
              <GitHubLogoIcon width="14" height="14" />
              GitHub
            </a>
            <a
              href="https://discord.gg/6yAJ3XDHTt"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-white/45 hover:text-white/80 transition-colors"
            >
              <DiscordLogoIcon width="14" height="14" />
              Discord
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 pt-6 border-t border-white/6 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20 text-center md:text-left">
            KittyAnime does not store any files on the server. All media is hosted on 3rd party services.
          </p>
          <p className="text-[11px] text-white/15 shrink-0">
            © KittyAnime 🐾
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
