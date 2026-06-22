import React from "react";
import { DiscordLogoIcon, GitHubLogoIcon } from "@radix-ui/react-icons";

const KITTY_ICON = "https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/1f431.svg";

const Footer = () => {
  return (
    <footer className="w-full bg-[#020f04] border-t border-green-900/40 shadow-xl p-8 flex flex-col items-center space-y-5">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center gap-1">
        <img
          src={KITTY_ICON}
          alt="KittyAnime"
          width={56}
          height={56}
          className="drop-shadow-[0_0_12px_rgba(34,197,94,0.5)]"
        />
        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-400 to-green-600 tracking-widest kitty-text-glow">
          KittyAnime
        </p>
        <p className="text-xs text-green-700/70 font-mono tracking-widest">~ nya ~</p>
      </div>

      {/* Paw divider */}
      <div className="flex items-center gap-2 text-green-700/50 text-sm select-none">
        <span>🐾</span>
        <span className="w-24 h-px bg-green-900/60"></span>
        <span>🐾</span>
        <span className="w-24 h-px bg-green-900/60"></span>
        <span>🐾</span>
      </div>

      {/* Social links */}
      <div className="flex space-x-5 items-center">
        <a
          href="https://github.com/Dovakiin0/Kitsune"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-500/60 hover:text-green-400 transition-colors duration-200"
          title="Original Kitsune on GitHub"
        >
          <GitHubLogoIcon suppressHydrationWarning width="25" height="25" />
        </a>
        <a
          href="https://discord.gg/6yAJ3XDHTt"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-500/60 hover:text-green-400 transition-colors duration-200"
        >
          <DiscordLogoIcon suppressHydrationWarning width="25" height="25" />
        </a>
      </div>

      {/* Fork notice */}
      <p className="text-xs text-green-700/60 text-center">
        KittyAnime is a fork of{" "}
        <a
          href="https://github.com/Dovakiin0/Kitsune"
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-500 hover:text-green-400 underline underline-offset-2 transition-colors duration-200"
        >
          Kitsune by Dovakiin0
        </a>
      </p>

      <p className="text-xs text-green-800/60">
        KittyAnime does not store any files on the server, we only link to the
        media which is hosted on 3rd party services.
      </p>
      <p className="text-xs text-green-800/50">&copy; KittyAnime 🐾</p>
    </footer>
  );
};

export default Footer;
