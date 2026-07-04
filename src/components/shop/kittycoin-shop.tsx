"use client";

import React, { useMemo, useState } from "react";
import Container from "@/components/layout/container";
import FramedAvatar from "@/components/common/framed-avatar";
import { useAuthStore } from "@/store/auth-store";
import { useKittycoins } from "@/hooks/use-kittycoins";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";
import { RARITY_COLORS, type ShopItem, type ShopItemType } from "@/lib/shop/catalog";
import { Coins, Check, Sparkles, Loader2 } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import LoginPopoverButton from "@/components/auth/login-popover-button";

const TABS: ShopItemType[] = ["frame", "sticker", "icon"];

function ShopItemPreview({ item }: { item: ShopItem }) {
  if (item.type === "frame" && item.imageUrl) {
    return (
      <div className="relative w-12 h-12 shrink-0">
        <div className="absolute inset-[14%] rounded-full bg-accent dark:bg-white/10" />
        <Image src={item.imageUrl} alt="" fill unoptimized className="object-contain" />
      </div>
    );
  }
  if (item.imageUrl) {
    return (
      <div className={cn("relative shrink-0", item.stickerLarge ? "w-14 h-14" : "w-10 h-10")}>
        <Image
          src={item.imageUrl}
          alt=""
          fill
          unoptimized
          className={cn("object-contain", item.stickerLarge && "mix-blend-screen")}
        />
      </div>
    );
  }
  return <div className="text-3xl leading-none">{item.preview}</div>;
}

function ShopItemCard({
  item,
  balance,
  equippedSlug,
  busy,
  onBuy,
  onEquip,
}: {
  item: ShopItem & { owned: boolean };
  balance: number;
  equippedSlug: string | null;
  busy: string | null;
  onBuy: () => void;
  onEquip: () => void;
}) {
  const t = useT();
  const isEquipped = equippedSlug === item.slug;
  const canAfford = item.price <= balance;
  const isBusy = busy === item.slug;

  return (
    <div className="site-panel p-4 flex flex-col gap-3 h-full">
      <div className="flex items-start justify-between gap-2">
        <ShopItemPreview item={item} />
        <span
          className={cn(
            "text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border",
            RARITY_COLORS[item.rarity],
          )}
        >
          {item.rarity}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-foreground dark:text-white/90">{item.name}</h3>
        <p className="text-[11px] text-muted-foreground dark:text-white/40 mt-1 leading-relaxed">{item.description}</p>
        {item.donatorOnly && (
          <p className="text-[10px] text-fuchsia-300/80 mt-2 font-mono">{t("shop.supporterOnly")}</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 pt-1 border-t border-border dark:border-white/[0.06]">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300/90 tabular-nums">
          <Coins className="w-3.5 h-3.5" />
          {item.price === 0 ? t("shop.free") : item.price}
        </span>

        {item.owned ? (
          <button
            type="button"
            disabled={isBusy || isEquipped}
            onClick={onEquip}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all",
              isEquipped
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/25"
                : "site-ghost-btn",
            )}
          >
            {isBusy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isEquipped ? (
              <span className="inline-flex items-center gap-1">
                <Check className="w-3 h-3" /> {t("shop.equipped")}
              </span>
            ) : (
              t("shop.equip")
            )}
          </button>
        ) : (
          <button
            type="button"
            disabled={isBusy || (!canAfford && item.price > 0)}
            onClick={onBuy}
            className={cn(
              "text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all",
              canAfford || item.price === 0 ? "site-brand-btn" : "site-ghost-btn opacity-40",
            )}
          >
            {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : t("shop.buy")}
          </button>
        )}
      </div>
    </div>
  );
}

export default function KittycoinShop() {
  const t = useT();
  const auth = useAuthStore((s) => s.auth);
  const { balance, catalog, equipped, loaded, purchase, equip } = useKittycoins(!!auth);
  const [tab, setTab] = useState<ShopItemType>("frame");
  const [busy, setBusy] = useState<string | null>(null);

  const items = useMemo(
    () => catalog.filter((item) => item.type === tab),
    [catalog, tab],
  );

  const handleBuy = async (item: ShopItem & { owned: boolean }) => {
    setBusy(item.slug);
    try {
      await purchase(item.slug);
      toast.success(t("shop.purchased", { name: item.name }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shop.purchaseFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleEquip = async (item: ShopItem & { owned: boolean }) => {
    setBusy(item.slug);
    try {
      await equip(item.slug, item.type);
      toast.success(t("shop.equippedToast", { name: item.name }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("shop.equipFailed"));
    } finally {
      setBusy(null);
    }
  };

  if (!auth) {
    return (
      <Container className="py-16">
        <div className="site-panel p-8 text-center max-w-lg mx-auto">
          <Sparkles className="w-10 h-10 text-violet-400/60 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground dark:text-white mb-2">{t("shop.title")}</h1>
          <p className="text-sm text-muted-foreground dark:text-white/45 mb-6">{t("shop.signIn")}</p>
          <LoginPopoverButton />
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 pb-24">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <p className="site-label mb-2">{t("shop.eyebrow")}</p>
          <h1 className="text-3xl md:text-4xl font-black text-foreground dark:text-white tracking-tight">{t("shop.title")}</h1>
          <p className="text-sm text-muted-foreground dark:text-white/45 mt-2 max-w-xl">{t("shop.subtitle")}</p>
        </div>

        <div className="site-panel px-5 py-4 flex items-center gap-4 shrink-0">
          <FramedAvatar
            url={auth.avatar}
            username={auth.username}
            frameSlug={equipped.frame}
            className="w-14 h-14"
          />
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground dark:text-white/35">{t("shop.balance")}</p>
            <p className="text-2xl font-black text-amber-300 tabular-nums inline-flex items-center gap-2">
              <Coins className="w-5 h-5" />
              {loaded ? balance.toLocaleString() : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="site-panel p-5 mb-8">
        <h2 className="text-sm font-bold text-foreground/90 dark:text-white/80 mb-3">{t("shop.earnTitle")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-[12px] text-muted-foreground dark:text-white/45">
          <p>{t("shop.earnWelcome")}</p>
          <p>{t("shop.earnDaily")}</p>
          <p>{t("shop.earnEpisode")}</p>
          <p>{t("shop.earnComment")}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTab(type)}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold border transition-all",
              tab === type
                ? "bg-violet-500/15 border-violet-400/30 text-violet-200"
                : "border-border dark:border-white/10 bg-muted/40 dark:bg-white/[0.03] text-muted-foreground dark:text-white/45 hover:text-foreground/85 dark:text-white/75",
            )}
          >
            {t(`shop.tabs.${type}`)}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="site-panel h-44 animate-pulse bg-muted/40 dark:bg-white/[0.03]" />
          ))}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <ShopItemCard
              key={item.slug}
              item={item}
              balance={balance}
              equippedSlug={equipped[item.type]}
              busy={busy}
              onBuy={() => void handleBuy(item)}
              onEquip={() => void handleEquip(item)}
            />
          ))}
        </div>
      )}
    </Container>
  );
}
