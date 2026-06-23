"use client";

import React from "react";
import Avatar from "./common/avatar";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Link from "next/link";
import { User, LogOut, BookMarked } from "lucide-react";
import { anisurgeAuth, clearAnisurgeToken } from "@/lib/anisurge";

type Props = { auth: IAuthStore };

function NavbarAvatar({ auth }: Props) {
  const [open, setOpen] = React.useState(false);
  if (!auth.auth) return null;

  const close = () => setOpen(false);

  const handleLogout = () => {
    anisurgeAuth.logout();
    clearAnisurgeToken();
    auth.clearAuth();
    close();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full ring-2 ring-white/20 hover:ring-white/50 transition-all">
          <Avatar
            username={auth.auth.username}
            url={auth.auth.avatar || undefined}
            className="w-8 h-8"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-white/70 rounded-full border-2 border-black" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-52 mt-2 p-0 bg-[#0a0a0a] border border-white/15 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-white/10 flex items-center gap-3">
          <Avatar
            username={auth.auth.username}
            url={auth.auth.avatar || undefined}
            className="w-9 h-9 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-white/85 font-semibold text-sm truncate">
              {auth.auth.username}
            </p>
            <p className="text-white/30 text-[10px] font-mono truncate">
              {auth.auth.email}
            </p>
          </div>
        </div>

        <div className="py-1">
          <MenuItem
            href={`/profile/${auth.auth.username}`}
            icon={<User className="w-3.5 h-3.5" />}
            label="Profile"
            onClick={close}
          />
          <MenuItem
            href={`/profile/${auth.auth.username}#watchlist`}
            icon={<BookMarked className="w-3.5 h-3.5" />}
            label="Watchlist"
            onClick={close}
          />
        </div>

        <div className="border-t border-white/10 py-1">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-950/30 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({ href, icon, label, onClick }: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/65 hover:bg-white/8 hover:text-white/90 transition-colors"
    >
      <span className="text-white/35">{icon}</span>
      {label}
    </Link>
  );
}

export default NavbarAvatar;
