"use client";

import React from "react";
import Avatar from "./common/avatar";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Link from "next/link";
import { User, LogOut, BookMarked, Settings, Zap } from "lucide-react";
import { ROUTES } from "@/constants/routes";
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

  const isAdmin = auth.auth.role === "admin";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full ring-2 ring-white/15 hover:ring-white/45 transition-all duration-200 group">
          <Avatar
            username={auth.auth.username}
            url={auth.auth.avatar || undefined}
            className="w-8 h-8"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-black shadow-sm shadow-emerald-400/50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-56 mt-2 p-0 bg-[#0d0d0d] border border-white/10 rounded-xl shadow-2xl shadow-black/70 overflow-hidden"
      >
        {/* User header */}
        <div className="relative px-4 py-3.5 border-b border-white/8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative flex items-center gap-3">
            <div className="relative shrink-0">
              <Avatar
                username={auth.auth.username}
                url={auth.auth.avatar || undefined}
                className="w-9 h-9"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border-2 border-[#0d0d0d]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <p className="text-white/90 font-semibold text-sm truncate leading-tight">
                  {auth.auth.username}
                </p>
                {isAdmin && (
                  <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-500/15 border border-amber-500/20 text-amber-400/80 uppercase tracking-wider">
                    Admin
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Zap className="w-2.5 h-2.5 text-violet-400/60 shrink-0" />
                <p className="text-white/25 text-[10px] font-mono truncate">Anisurge</p>
              </div>
            </div>
          </div>
        </div>

        <div className="py-1.5">
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
          <MenuItem
            href={ROUTES.SETTINGS}
            icon={<Settings className="w-3.5 h-3.5" />}
            label="Settings"
            onClick={close}
          />
        </div>

        <div className="border-t border-white/8 py-1.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400/80 hover:bg-red-500/8 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
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
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-white/55 hover:bg-white/6 hover:text-white/90 transition-colors"
    >
      <span className="text-white/30">{icon}</span>
      {label}
    </Link>
  );
}

export default NavbarAvatar;
