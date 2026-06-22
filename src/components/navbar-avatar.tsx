"use client";

import React from "react";
import Avatar from "./common/avatar";
import { IAuthStore } from "@/store/auth-store";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import Link from "next/link";
import { User, LogOut, Settings, BookMarked } from "lucide-react";
import { pb } from "@/lib/pocketbase";

type Props = { auth: IAuthStore };

function NavbarAvatar({ auth }: Props) {
  const [open, setOpen] = React.useState(false);
  if (!auth.auth) return null;

  const close = () => setOpen(false);

  const handleLogout = () => {
    pb.authStore.clear();
    auth.clearAuth();
    close();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full ring-2 ring-green-600/60 hover:ring-green-400 transition-all">
          <Avatar
            username={auth.auth.username}
            url={auth.auth.avatar}
            id={auth.auth.id}
            collectionID={auth.auth.collectionId}
            className="w-8 h-8"
          />
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#020f04]" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="bottom"
        align="end"
        className="w-52 mt-2 p-0 bg-[#020f04] border border-green-900/60 rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-green-900/40 flex items-center gap-3">
          <Avatar
            username={auth.auth.username}
            url={auth.auth.avatar}
            id={auth.auth.id}
            collectionID={auth.auth.collectionId}
            className="w-9 h-9 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-green-200 font-semibold text-sm truncate">
              {auth.auth.username}
            </p>
            <p className="text-green-700 text-[10px] font-mono truncate">
              {auth.auth.email}
            </p>
          </div>
        </div>

        {/* Menu items */}
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

        <div className="border-t border-green-900/40 py-1">
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

function MenuItem({
  href,
  icon,
  label,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2 text-sm text-green-300 hover:bg-green-900/30 hover:text-green-200 transition-colors"
    >
      <span className="text-green-600">{icon}</span>
      {label}
    </Link>
  );
}

export default NavbarAvatar;
