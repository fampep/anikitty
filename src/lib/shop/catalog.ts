export type ShopItemType = "frame" | "sticker" | "icon";

export type ShopItemRarity = "common" | "rare" | "epic" | "legendary";

export type ShopItem = {
  slug: string;
  type: ShopItemType;
  name: string;
  description: string;
  price: number;
  rarity: ShopItemRarity;
  preview: string;
  imageUrl?: string;
  frameClass?: string;
  stickerEmoji?: string;
  iconEmoji?: string;
  /** Larger profile-banner sticker (anime art) */
  stickerLarge?: boolean;
  donatorOnly?: boolean;
};

export const KITTYCOIN_REWARDS = {
  welcome: 100,
  dailyLogin: 15,
  episodeComplete: 8,
  comment: 5,
  kofiBonus: 50,
} as const;

export const FREE_FRAME_SLUG = "frame-classic";

export const SHOP_CATALOG: ShopItem[] = [
  {
    slug: FREE_FRAME_SLUG,
    type: "frame",
    name: "Classic Ring",
    description: "A clean silver ring around your avatar.",
    price: 0,
    rarity: "common",
    preview: "⭕",
    imageUrl: "/shop/frames/frame-classic.svg",
    frameClass: "ring-2 ring-white/30",
  },
  {
    slug: "frame-violet",
    type: "frame",
    name: "Violet Halo",
    description: "Soft violet glow for true AniKitty fans.",
    price: 75,
    rarity: "common",
    preview: "💜",
    imageUrl: "/shop/frames/frame-violet.svg",
    frameClass: "ring-2 ring-violet-400 shadow-[0_0_14px_rgba(124,58,237,0.55)]",
  },
  {
    slug: "frame-neon",
    type: "frame",
    name: "Neon Pulse",
    description: "Electric cyan border that pops in chat.",
    price: 120,
    rarity: "rare",
    preview: "⚡",
    imageUrl: "/shop/frames/frame-neon.svg",
    frameClass: "ring-2 ring-cyan-400 shadow-[0_0_16px_rgba(34,211,238,0.5)]",
  },
  {
    slug: "frame-gold",
    type: "frame",
    name: "Golden Crown",
    description: "Premium gold frame for dedicated watchers.",
    price: 200,
    rarity: "epic",
    preview: "👑",
    imageUrl: "/shop/frames/frame-gold.svg",
    frameClass: "ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]",
  },
  {
    slug: "frame-sakura",
    type: "frame",
    name: "Sakura Bloom",
    description: "Pink sakura petals aura around your avatar.",
    price: 150,
    rarity: "rare",
    preview: "🌸",
    imageUrl: "/shop/frames/frame-sakura.svg",
    frameClass: "ring-2 ring-pink-400 shadow-[0_0_14px_rgba(244,114,182,0.45)]",
  },
  {
    slug: "frame-supporter",
    type: "frame",
    name: "Supporter Aura",
    description: "Exclusive frame for Ko-fi supporters.",
    price: 100,
    rarity: "legendary",
    preview: "✨",
    imageUrl: "/shop/frames/frame-supporter.svg",
    frameClass: "ring-2 ring-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.55)]",
    donatorOnly: true,
  },
  {
    slug: "sticker-anime-peek",
    type: "sticker",
    name: "Anime Peek",
    description: "Someone is watching from behind the page…",
    price: 55,
    rarity: "rare",
    preview: "👀",
    imageUrl: "/shop/stickers/sticker-anime-peek.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-zero-two",
    type: "sticker",
    name: "Zero Two",
    description: "Darling in the Franxx — thinking pose sticker for your banner.",
    price: 85,
    rarity: "epic",
    preview: "002",
    imageUrl: "/shop/stickers/sticker-zero-two.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-naruto-shocked",
    type: "sticker",
    name: "Naruto Shocked",
    description: "Naruto Shippuden — peak reaction sticker energy.",
    price: 70,
    rarity: "rare",
    preview: "🍥",
    imageUrl: "/shop/stickers/sticker-naruto-shocked.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-saitama-ok",
    type: "sticker",
    name: "Saitama OK",
    description: "One Punch Man — the OK meme on your profile.",
    price: 75,
    rarity: "rare",
    preview: "OK",
    imageUrl: "/shop/stickers/sticker-saitama-ok.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-azusa",
    type: "sticker",
    name: "Azusa",
    description: "K-On! — Azusa Nakano in a thoughtful mood.",
    price: 80,
    rarity: "rare",
    preview: "🎸",
    imageUrl: "/shop/stickers/sticker-azusa.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-yui-glass",
    type: "sticker",
    name: "Yui on Glass",
    description: "K-On! — Yui Hirasawa pressed against the screen.",
    price: 85,
    rarity: "epic",
    preview: "🎵",
    imageUrl: "/shop/stickers/sticker-yui-glass.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-satania",
    type: "sticker",
    name: "Satania",
    description: "Gabriel DropOut — Satania is not amused.",
    price: 75,
    rarity: "rare",
    preview: "😤",
    imageUrl: "/shop/stickers/sticker-satania.png",
    stickerLarge: true,
  },
  {
    slug: "sticker-killua",
    type: "sticker",
    name: "Killua",
    description: "Hunter x Hunter — Killua Zoldyck on your profile.",
    price: 90,
    rarity: "epic",
    preview: "⚡",
    imageUrl: "/shop/stickers/sticker-killua.png",
    stickerLarge: true,
  },
  {
    slug: "icon-clapper",
    type: "icon",
    name: "Director",
    description: "Clapper icon beside your name.",
    price: 45,
    rarity: "common",
    preview: "🎬",
    imageUrl: "/shop/stickers/clapper.png",
    iconEmoji: "🎬",
  },
  {
    slug: "icon-popcorn",
    type: "icon",
    name: "Popcorn",
    description: "Always ready for the next episode.",
    price: 50,
    rarity: "common",
    preview: "🍿",
    imageUrl: "/shop/stickers/popcorn.png",
    iconEmoji: "🍿",
  },
  {
    slug: "icon-crown",
    type: "icon",
    name: "Royalty",
    description: "Crown icon for profile royalty.",
    price: 120,
    rarity: "epic",
    preview: "👑",
    imageUrl: "/shop/stickers/crown.png",
    iconEmoji: "👑",
  },
  {
    slug: "icon-ghost",
    type: "icon",
    name: "Ghost Watcher",
    description: "Spooky icon for late-night sessions.",
    price: 70,
    rarity: "rare",
    preview: "👻",
    imageUrl: "/shop/stickers/ghost.png",
    iconEmoji: "👻",
  },
  {
    slug: "icon-diamond",
    type: "icon",
    name: "Diamond",
    description: "Sparkling status for top collectors.",
    price: 180,
    rarity: "legendary",
    preview: "💎",
    imageUrl: "/shop/stickers/diamond.png",
    iconEmoji: "💎",
  },
];

const catalogBySlug = new Map(SHOP_CATALOG.map((item) => [item.slug, item]));

export function getShopItem(slug: string): ShopItem | undefined {
  return catalogBySlug.get(slug);
}

export function getFrameClass(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return getShopItem(slug)?.frameClass;
}

export function getFrameImageUrl(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  const item = getShopItem(slug);
  return item?.type === "frame" ? item.imageUrl : undefined;
}

export function getStickerEmoji(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return getShopItem(slug)?.stickerEmoji;
}

export function getStickerImageUrl(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  const item = getShopItem(slug);
  return item?.type === "sticker" ? item.imageUrl : undefined;
}

export function isLargeSticker(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return getShopItem(slug)?.stickerLarge ?? false;
}

export function getIconEmoji(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  return getShopItem(slug)?.iconEmoji;
}

export function getIconImageUrl(slug: string | null | undefined): string | undefined {
  if (!slug) return undefined;
  const item = getShopItem(slug);
  return item?.type === "icon" ? item.imageUrl : undefined;
}

export const RARITY_COLORS: Record<ShopItemRarity, string> = {
  common: "text-white/50 border-white/15 bg-white/5",
  rare: "text-sky-300/90 border-sky-400/25 bg-sky-500/10",
  epic: "text-violet-300/90 border-violet-400/30 bg-violet-500/10",
  legendary: "text-amber-300/90 border-amber-400/30 bg-amber-500/10",
};
