"use client";

import Link from "next/link";
import Image from "next/image";

const KITTY_ICON = "/jiji.jpg";
import { cn } from "@/lib/utils";

import Container from "./container";
import { Separator } from "./ui/separator";

import { nightTokyo } from "@/utils/fonts";
import { ROUTES } from "@/constants/routes";
import React, { ReactNode, useEffect, useState } from "react";

import SearchBar from "./search-bar";
import { InfoIcon, MenuIcon, X } from "lucide-react";
import useScrollPosition from "@/hooks/use-scroll-position";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import LoginPopoverButton from "./login-popover-button";
import { useAuthStore } from "@/store/auth-store";
import NavbarAvatar from "./navbar-avatar";
import { toast } from "sonner";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { anisurgeAuth, clearAnisurgeToken, getAnisurgeToken } from "@/lib/anisurge";

const menuItems: Array<{ title: string; href: string }> = [
  { title: "Home", href: ROUTES.HOME },
];

const NavBar = () => {
  const auth = useAuthStore();
  const { y } = useScrollPosition();
  const isHeaderFixed = true;
  const isHeaderSticky = y > 0;
  const [hasSeenDomainChangeBanner, setHasSeenDomainChangeBanner] =
    useState<boolean>(() => {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem("seenDomainChangeBanner") === "true";
      }
      return true;
    });

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
    <div
      className={cn([
        "h-fit w-full",
        "sticky top-0 z-[100] duration-300",
        isHeaderFixed ? "fixed bg-gradient-to-b from-black" : "",
        isHeaderSticky
          ? "bg-clip-padding backdrop-filter backdrop-blur-md bg-opacity-10 bg-black"
          : "",
        "border-b border-white/10",
      ])}
    >
      {false && !hasSeenDomainChangeBanner && (
        <Alert variant="default" className="text-white/70 bg-white/5 border-white/15">
          <AlertTitle className="font-bold flex items-center justify-center space-x-2">
            <div className="flex items-center gap-2">
              <InfoIcon size="20" />
              <p>Welcome to KittyAnime! 🐾</p>
            </div>
            <p
              className="cursor-pointer"
              onClick={() => {
                localStorage.setItem("seenDomainChangeBanner", "true");
                setHasSeenDomainChangeBanner(true);
              }}
            >
              <i><u>Close</u></i>
            </p>
          </AlertTitle>
        </Alert>
      )}
      <Container className="flex items-center justify-between py-2 gap-20 ">
        <Link
          href={ROUTES.HOME}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="relative w-10 h-10 rounded-full overflow-hidden ring-1 ring-white/15 group-hover:ring-white/35 transition-all duration-300">
            <Image
              src={KITTY_ICON}
              alt="KittyAnime"
              fill
              className="object-cover object-top"
              unoptimized
            />
          </div>
          <div className="flex flex-col leading-none">
            <h1
              className={cn([
                nightTokyo.className,
                "text-2xl font-bold text-white tracking-widest",
              ])}
            >
              KittyAnime
            </h1>
            <span className="text-[10px] text-white/35 tracking-widest font-mono ml-0.5">~ nya ~</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-6 ml-10">
          {menuItems.map((menu, idx) => (
            <Link
              href={menu.href}
              key={idx}
              className="text-sm text-white/50 hover:text-white/90 transition-colors duration-200 font-medium tracking-wide"
            >
              {menu.title}
            </Link>
          ))}
        </div>
        <div className="w-1/3 hidden lg:flex items-center gap-5">
          <SearchBar />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>
        <div className="lg:hidden flex items-center gap-5">
          <MobileMenuSheet trigger={<MenuIcon suppressHydrationWarning />} />
          {auth.auth ? <NavbarAvatar auth={auth} /> : <LoginPopoverButton />}
        </div>
      </Container>
    </div>
  );
};

const MobileMenuSheet = ({ trigger }: { trigger: ReactNode }) => {
  const [open, setOpen] = useState<boolean>(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger>{trigger}</SheetTrigger>
      <SheetContent
        className="flex flex-col w-[80vw] z-[150]"
        hideCloseButton
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-full h-full relative">
          <SheetClose className="absolute top-0 right-0">
            <X />
          </SheetClose>
          <div className="flex flex-col gap-5 mt-10">
            {menuItems.map((menu, idx) => (
              <Link
                href={menu.href}
                key={idx}
                onClick={() => setOpen(false)}
                className="text-white/70 hover:text-white transition-colors font-medium"
              >
                {menu.title}
              </Link>
            ))}
            <Separator />
            <SearchBar onAnimeClick={() => setOpen(false)} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default NavBar;
