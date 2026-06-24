"use client";

import Link from "next/link";
import Image from "next/image";

const KITTY_ICON = "/jiji.jpg";
import { cn } from "@/lib/utils";

import Container from "./container";

import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { CalendarDays, Flame, Home, MenuIcon, X } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import LoginPopoverButton from "./login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import { toast } from "sonner";
import { anisurgeAuth, clearAnisurgeToken, getAnisurgeToken } from "@/lib/anisurge";
import { usePathname } from "next/navigation";

const menuItems = [
  { title: "Home",     href: ROUTES.HOME,     icon: Home },
  { title: "Schedule", href: ROUTES.SCHEDULE, icon: CalendarDays },
  { title: "Trending", href: ROUTES.TRENDING, icon: Flame },
];

const NavBar = () => {
  const auth = useAuthStore();
  const { y } = useScrollPosition();
  const pathname = usePathname();
  const isScrolled = y > 20;

  useEffect(() => {
    const refreshAuth = async () => {
      const token = getAnisurgeToken();
      if (!token) return;
      try {
        const me = await anisurgeAuth.me();
        const user = me?.user ?? me;
        auth.setAuth({
          id: me.anisurgeUserId ?? user.externalUserId ?? "",
          username: user.username ?? "",
          email: user.email ?? "",
          avatar: user.customPfpUrl ?? user.avatarUrl ?? "",
          bannerUrl: user.bannerUrl ?? null,
          bio: user.bio ?? null,
          role: user.role ?? "user",
        });
      } catch (e: any) {
        if (e?.status === 401) {
          clearAnisurgeToken();
          auth.clearAuth();
          toast.error("Session expired. Please log in again.");
        }
      }
    };
    refreshAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-300",
        isScrolled
          ? "bg-black/80 backdrop-blur-xl border-b border-white/8 shadow-lg shadow-black/40"
          : "bg-gradient-to-b from-black/70 to-transparent border-b border-transparent",
      )}
    >
      <Container className="flex items-center h-14 gap-6">
        {/* Logo */}
        <Link href={ROUTES.HOME} className="flex items-center gap-2.5 shrink-0 group">
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-1 ring-white/15 group-hover:ring-white/40 transition-all duration-300 shrink-0">
            <Image src={KITTY_ICON} alt="KittyAnime" fill className="object-cover object-top" unoptimized />
          </div>
          <span className={cn(nightTokyo.className, "text-xl font-bold text-white tracking-widest hidden sm:block")}>
            KittyAnime
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-white/50 hover:text-white/90 hover:bg-white/6",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search + auth */}
        <div className="hidden lg:flex items-center gap-3">
          <SearchBar />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>

        {/* Mobile */}
        <div className="lg:hidden flex items-center gap-3">
          <MobileMenuSheet pathname={pathname} trigger={<MenuIcon className="h-5 w-5 text-white/70" suppressHydrationWarning />} />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>
      </Container>
    </header>
  );
};

const MobileMenuSheet = ({ trigger, pathname }: { trigger: ReactNode; pathname: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-1.5 rounded-lg hover:bg-white/8 transition-colors">{trigger}</button>
      </SheetTrigger>
      <SheetContent
        className="flex flex-col w-[75vw] max-w-xs z-[150] bg-black/95 backdrop-blur-xl border-white/10"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-5 border-b border-white/8">
            <span className={cn(nightTokyo.className, "text-lg font-bold text-white tracking-widest")}>
              KittyAnime
            </span>
            <SheetClose className="p-1 rounded-lg hover:bg-white/8 transition-colors text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </SheetClose>
          </div>

          <nav className="flex flex-col gap-1 p-4">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-white/10 text-white border border-white/12"
                      : "text-white/50 hover:text-white hover:bg-white/6",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pb-4 mt-2">
            <SearchBar onAnimeClick={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
