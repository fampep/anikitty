import React from "react";
import Image from "next/image";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

const KITTY_ICON = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f431.svg";

const Footer = () => {
  return (
    <footer className="w-full bg-black border-t border-white/10 shadow-xl p-8 flex flex-col items-center space-y-5">
      <div className="flex flex-col items-center gap-1">
        <Image
          src={KITTY_ICON}
          alt="KittyAnime"
          width={56}
          height={56}
          className="opacity-70"
        />
        <p className="text-2xl font-bold text-white tracking-widest">
          KittyAnime
        </p>
        <p className="text-xs text-white/30 font-mono tracking-widest">~ nya ~</p>
      </div>

      <div className="flex items-center gap-2 text-white/20 text-sm select-none">
        <span>🐾</span>
        <span className="w-24 h-px bg-white/10"></span>
        <span>🐾</span>
        <span className="w-24 h-px bg-white/10"></span>
        <span>🐾</span>
      </div>

      <div className="flex space-x-5 items-center">
        <a
          href="https://github.com/Dovakiin0/Kitsune"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-white/70 transition-colors duration-200"
          title="Original Kitsune on GitHub"
        >
          <GitHubLogoIcon suppressHydrationWarning width="25" height="25" />
        </a>
        <a
          href="https://discord.gg/6yAJ3XDHTt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/30 hover:text-white/70 transition-colors duration-200"
        >
          <DiscordLogoIcon suppressHydrationWarning width="25" height="25" />
        </a>
      </div>

      <p className="text-xs text-white/30 text-center">
        KittyAnime is a fork of{" "}
        <a
          href="https://github.com/Dovakiin0/Kitsune"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/50 hover:text-white/80 underline underline-offset-2 transition-colors duration-200"
        >
          Kitsune by Dovakiin0
        </a>
      </p>

      <p className="text-xs text-white/20">
        KittyAnime does not store any files on the server, we only link to the
        media which is hosted on 3rd party services.
      </p>
      <p className="text-xs text-white/15">&copy; KittyAnime 🐾</p>
    </footer>
  );
};

export default Footer;
