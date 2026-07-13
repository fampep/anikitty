"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { CosmeticUsername } from "@/components/common/user-cosmetics";
import ProfileMediaPreview from "@/components/profile/profile-media-preview";
import ProfileBioContent from "@/components/profile/profile-bio-content";
import ProfileSubNav from "@/components/profile/profile-sub-nav";
import ProfileCommentsFeed from "@/components/profile/profile-comments-feed";
import Loading from "@/app/loading";
import { withAuth } from "@/lib/auth/auth-fetch";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { ChevronLeft } from "lucide-react";

type ProfileHeader = {
  username: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  equippedFrame?: string | null;
  equippedIcon?: string | null;
};

async function fetchProfileHeader(username: string) {
  const r = await fetch(`/api/users/${encodeURIComponent(username)}`, withAuth());
  if (r.status === 404) return { notFound: true as const };
  if (r.status === 403) {
    const data = await r.json().catch(() => ({}));
    if (data.private) return { hidden: true as const };
  }
  if (!r.ok) return null;
  const data = await r.json();
  return {
    user: data.user as ProfileHeader,
    commentCount: data.level?.commentCount as number | undefined,
  };
}

export default function ProfileCommentsPage() {
  const t = useT();
  const params = useParams();
  const username = decodeURIComponent((params.username as string) ?? "");
  const [profile, setProfile] = useState<ProfileHeader | null>(null);
  const [commentCount, setCommentCount] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchProfileHeader(username).then((result) => {
      if (cancelled) return;
      if (!result) {
        setLoading(false);
        return;
      }
      if ("notFound" in result) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      if ("hidden" in result) {
        setHidden(true);
        setLoading(false);
        return;
      }
      setProfile(result.user);
      setCommentCount(result.commentCount);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading) return <Loading />;

  if (notFound) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-3 text-center px-4">
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.notFound")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40">{t("profile.notFoundDesc", { username })}</p>
        <Link href={ROUTES.HOME} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          {t("profile.goHome")}
        </Link>
      </div>
    );
  }

  if (hidden) {
    return (
      <div className="min-h-screen pt-24 flex flex-col items-center gap-3 text-center px-4">
        <p className="text-xl font-bold text-foreground dark:text-white">{t("profile.ninjaMode")}</p>
        <p className="text-sm text-muted-foreground dark:text-white/40">{t("profile.ninjaModeDesc", { username })}</p>
        <Link href={ROUTES.HOME} className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
          {t("profile.backToHome")}
        </Link>
      </div>
    );
  }

  if (!profile) return <Loading />;

  return (
    <div className="min-h-screen pb-24">
      <div className="relative h-40 md:h-48 w-full overflow-hidden">
        {profile.bannerUrl ? (
          <div className="absolute inset-0">
            <ProfileMediaPreview src={profile.bannerUrl} alt="" variant="banner" />
          </div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 via-black to-neutral-900" />
        )}
        <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </div>

      <Container className="-mt-14 relative z-10">
        <Link
          href={ROUTES.profile(username)}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white/80 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("profile.commentsPage.backToProfile")}
        </Link>

        <div className="flex items-end gap-4 mb-8">
          <FramedAvatar
            className="w-20 h-20 md:w-24 md:h-24 shrink-0 ring-4 ring-background dark:ring-[#0a0a0a]"
            username={profile.username}
            url={profile.avatarUrl ?? undefined}
            frameSlug={profile.equippedFrame}
          />
          <div className="min-w-0 pb-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground dark:text-white truncate">
              <CosmeticUsername username={profile.username} iconSlug={profile.equippedIcon} />
            </h1>
            <p className="text-sm text-muted-foreground dark:text-white/50 mt-0.5">
              {t("profile.commentsPage.subtitle")}
            </p>
          </div>
        </div>

        {profile.bio && (
          <div className="mb-6 rounded-xl border border-border dark:border-white/10 bg-muted/30 dark:bg-neutral-900 px-4 py-3 lg:hidden">
            <ProfileBioContent bio={profile.bio} />
          </div>
        )}

        <ProfileSubNav
          username={username}
          active="comments"
          commentCount={commentCount}
          placement="mobile"
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
          <ProfileSubNav
            username={username}
            active="comments"
            commentCount={commentCount}
            placement="sidebar"
          />
          <main className="min-w-0 pb-8">
            <ProfileCommentsFeed username={username} variant="full" />
          </main>
        </div>
      </Container>
    </div>
  );
}
