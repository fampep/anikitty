"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import ProfileBioContent from "@/components/profile/profile-bio-content";
import ProfileSubNav from "@/components/profile/profile-sub-nav";
import { ProfileCollectionsFeed } from "@/components/profile/profile-collections-feed";
import Loading from "@/app/loading";
import { withAuth } from "@/lib/auth/auth-fetch";
import { useAuthStore } from "@/store/auth-store";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";

type ProfileHeader = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
};

export default function ProfileCollectionsPage() {
  const t = useT();
  const params = useParams();
  const { auth } = useAuthStore();
  const username = decodeURIComponent((params.username as string) ?? "");
  const [profile, setProfile] = useState<ProfileHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await fetch(`/api/users/${encodeURIComponent(username)}`, withAuth());
        if (cancelled) return;
        if (r.status === 404) {
          setNotFound(true);
          return;
        }
        if (r.status === 403) {
          const data = await r.json().catch(() => ({}));
          if (data.private) setHidden(true);
          return;
        }
        if (!r.ok) return;
        const data = await r.json();
        setProfile(data.user as ProfileHeader);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-3 px-4 pt-24 text-center">
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.notFound")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40">
          {t("profile.notFoundDesc", { username })}
        </p>
        <Link href={ROUTES.HOME} className="text-sm text-zinc-400 transition-colors hover:text-zinc-300">
          {t("profile.goHome")}
        </Link>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="flex min-h-screen flex-col items-center gap-3 px-4 pt-24 text-center">
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.ninjaMode")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40">
          {t("profile.ninjaModeDesc", { username })}
        </p>
        <Link href={ROUTES.HOME} className="text-sm text-zinc-400 transition-colors hover:text-zinc-300">
          {t("profile.backToHome")}
        </Link>
      </div>
    );
  }

  if (!profile) return <Loading />;

  const isSelf = auth?.id === profile.id;

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-40 w-full overflow-hidden md:h-48">
        {profile.bannerUrl ? (
          <div className="absolute inset-0">
            <ProfileMediaPreview src={profile.bannerUrl} alt="" variant="banner" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </div>

      <Container className="relative z-10 -mt-14">
        <Link
          href={ROUTES.profile(username)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground dark:text-white/50 dark:hover:text-white/80"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("profile.collectionsPage.backToProfile")}
        </Link>

        <div className="mb-8 flex items-end gap-4">
          <FramedAvatar
            className="h-20 w-20 shrink-0 ring-4 ring-background md:h-24 md:w-24 dark:ring-[#0a0a0a]"
            username={profile.username}
            url={profile.avatarUrl ?? undefined}
            frameSlug={profile.equippedFrame}
          />
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-2xl font-black tracking-tight text-foreground md:text-3xl dark:text-white">
              <CosmeticUsername username={profile.username} iconSlug={profile.equippedIcon} />
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground dark:text-white/50">
              {t("profile.collectionsPage.subtitle")}
            </p>
          </div>
        </div>

        {profile.bio && (
          <div className="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3 lg:hidden dark:border-white/10 dark:bg-neutral-900">
            <ProfileBioContent bio={profile.bio} />
          </div>
        )}

        <ProfileSubNav username={username} active="collections" placement="mobile" />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
          <ProfileSubNav username={username} active="collections" placement="sidebar" />
          <main className="min-w-0 pb-8">
            <ProfileCollectionsFeed userId={profile.id} isSelf={isSelf} />
          </main>
        </div>
      </Container>
    </div>
  );
}
