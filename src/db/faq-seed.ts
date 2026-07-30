/** Plain FAQ seed for migrateDb — not used as runtime source of truth. */
export type FaqSeedCategory = {
  id: string;
  labelKey: string;
  icon: string;
  order: number;
};

export type FaqSeedArticle = {
  id: string;
  category: string;
  tags: string[];
  title: string;
  answer: string;
  updatedAt: string;
  order: number;
  popularity: number;
  relatedIds: string[];
};

export const FAQ_SEED_CATEGORIES: FaqSeedCategory[] = [
  {
    "id": "getting-started",
    "labelKey": "faq.categories.gettingStarted",
    "icon": "Rocket",
    "order": 10
  },
  {
    "id": "account",
    "labelKey": "faq.categories.account",
    "icon": "User",
    "order": 20
  },
  {
    "id": "watching",
    "labelKey": "faq.categories.watching",
    "icon": "Tv2",
    "order": 30
  },
  {
    "id": "watchlists",
    "labelKey": "faq.categories.watchlists",
    "icon": "Bookmark",
    "order": 40
  },
  {
    "id": "history",
    "labelKey": "faq.categories.history",
    "icon": "History",
    "order": 50
  },
  {
    "id": "chat",
    "labelKey": "faq.categories.chat",
    "icon": "MessageSquare",
    "order": 60
  },
  {
    "id": "search",
    "labelKey": "faq.categories.search",
    "icon": "Search",
    "order": 70
  },
  {
    "id": "ratings",
    "labelKey": "faq.categories.ratings",
    "icon": "Star",
    "order": 80
  },
  {
    "id": "notifications",
    "labelKey": "faq.categories.notifications",
    "icon": "Bell",
    "order": 90
  },
  {
    "id": "premium",
    "labelKey": "faq.categories.premium",
    "icon": "Coffee",
    "order": 100
  },
  {
    "id": "troubleshooting",
    "labelKey": "faq.categories.troubleshooting",
    "icon": "Wrench",
    "order": 110
  },
  {
    "id": "general",
    "labelKey": "faq.categories.general",
    "icon": "CircleHelp",
    "order": 120
  }
];

export const FAQ_SEED_ARTICLES: FaqSeedArticle[] = [
  {
    "id": "what-is-anikitty",
    "category": "getting-started",
    "tags": [
      "basics",
      "about",
      "overview",
      "free",
      "ad-free"
    ],
    "title": "What is AniKitty?",
    "answer": "AniKitty is a free, ad-free anime streaming site with no subscription paywall. Browse the catalog, watch episodes in sub or dub where available, rate and review titles, and join community features when signed in.\n\nOptional Ko-fi tips unlock the **donator** rank and badge. AniKitty does **not** host video files — streams are resolved through third-party sources via KittyAPI.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 100,
    "relatedIds": [
      "do-i-need-an-account",
      "is-anikitty-free",
      "how-streaming-works"
    ]
  },
  {
    "id": "do-i-need-an-account",
    "category": "getting-started",
    "tags": [
      "account",
      "signup",
      "guest",
      "login"
    ],
    "title": "Do I need an account?",
    "answer": "No — you can browse and watch without signing in.\n\nAn account unlocks:\n\n- Watchlist and synced progress across devices\n- Watch history\n- Episode comments, forum posts, and live chat\n- Friends, public profiles, levels and achievements\n- Kittycoins, optional AniList import, and reviews\n- Security options like 2FA and passkeys\n\nSign up from the **Log in** button in the navbar.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 95,
    "relatedIds": [
      "how-create-account",
      "what-is-anikitty",
      "is-anikitty-free"
    ]
  },
  {
    "id": "is-anikitty-free",
    "category": "getting-started",
    "tags": [
      "free",
      "ads",
      "subscription",
      "paywall",
      "cost"
    ],
    "title": "Is AniKitty really free?",
    "answer": "Yes. There is no paid subscription and no ads. Watching stays free for everyone.\n\nTip **€4** on Ko-fi with your `@username` to unlock about **30 days** of donator rank (plus the donator badge). Tips are optional.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 90,
    "relatedIds": [
      "what-tipping-gives",
      "is-kofi-required",
      "what-is-anikitty"
    ]
  },
  {
    "id": "how-create-account",
    "category": "account",
    "tags": [
      "signup",
      "register",
      "password",
      "username"
    ],
    "title": "How do I create an account?",
    "answer": "Click **Log in** in the navbar, switch to **Sign up**, and enter:\n\n- Username (3–25 letters, numbers, or underscores)\n- Email\n- Password (8+ characters)\n\nYour password is hashed before storage. After signing in you can add a **passkey** under Settings → Security for faster sign-in with Face ID, Touch ID, or Windows Hello.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 70,
    "relatedIds": [
      "passkeys",
      "two-factor-auth",
      "do-i-need-an-account"
    ]
  },
  {
    "id": "public-profile",
    "category": "account",
    "tags": [
      "profile",
      "avatar",
      "bio",
      "badge",
      "public"
    ],
    "title": "What is on my public profile?",
    "answer": "Others can see your avatar, banner, bio, role and level badges, achievements, watchlist lists, watch-activity heatmap, and recent episode comments — unless you turn on **Ninja mode** in Settings → Privacy.\n\nYour profile also shows follower counts, a library breakdown, and friend actions when viewing someone else.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 40,
    "relatedIds": [
      "ninja-mode",
      "achievements",
      "levels-and-xp"
    ]
  },
  {
    "id": "ninja-mode",
    "category": "account",
    "tags": [
      "privacy",
      "hide",
      "ninja",
      "profile"
    ],
    "title": "What is Ninja mode?",
    "answer": "Ninja mode hides your profile, watchlist, activity, and comments from everyone except you.\n\nYour username can still appear in live chat, forum posts, and episode comments.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 45,
    "relatedIds": [
      "public-profile",
      "privacy-data-stored",
      "block-users"
    ]
  },
  {
    "id": "levels-and-xp",
    "category": "account",
    "tags": [
      "xp",
      "level",
      "streak",
      "kittycoins"
    ],
    "title": "How do levels and XP work?",
    "answer": "XP comes from watching episodes and posting episode comments. Levels unlock display tiers on your profile, chat, and forum.\n\nDaily login streaks grant bonus Kittycoins every 7 days.",
    "updatedAt": "2026-07-25",
    "order": 40,
    "popularity": 35,
    "relatedIds": [
      "achievements",
      "public-profile",
      "kittycoin-shop"
    ]
  },
  {
    "id": "achievements",
    "category": "account",
    "tags": [
      "badges",
      "milestones",
      "achievements"
    ],
    "title": "What are achievements?",
    "answer": "Achievements are badges you unlock for milestones like episodes watched, comments posted, reviews written, leveling up, and login streaks.\n\nThey appear on your profile sidebar with progress bars for locked ones.",
    "updatedAt": "2026-07-25",
    "order": 50,
    "popularity": 30,
    "relatedIds": [
      "levels-and-xp",
      "public-profile"
    ]
  },
  {
    "id": "passkeys",
    "category": "account",
    "tags": [
      "passkey",
      "webauthn",
      "face id",
      "touch id",
      "security"
    ],
    "title": "Passkeys",
    "answer": "Optional passkeys let you sign in with Face ID, Touch ID, Windows Hello, or a security key instead of typing your password.\n\nAdd or remove them under **Settings → Security**. Passkeys are stored on your device (or synced by your password manager when supported).",
    "updatedAt": "2026-07-25",
    "order": 60,
    "popularity": 38,
    "relatedIds": [
      "two-factor-auth",
      "active-sessions",
      "password-protection"
    ]
  },
  {
    "id": "two-factor-auth",
    "category": "account",
    "tags": [
      "2fa",
      "totp",
      "authenticator",
      "security"
    ],
    "title": "Two-factor authentication (2FA)",
    "answer": "Optional TOTP can be enabled under **Settings → Security**.\n\nWhen enabled, login requires your password plus a 6-digit code from an authenticator app.",
    "updatedAt": "2026-07-25",
    "order": 70,
    "popularity": 36,
    "relatedIds": [
      "passkeys",
      "active-sessions",
      "password-protection"
    ]
  },
  {
    "id": "active-sessions",
    "category": "account",
    "tags": [
      "sessions",
      "devices",
      "logout",
      "revoke"
    ],
    "title": "Active sessions",
    "answer": "**Settings → Security** lists devices where you are logged in. You can revoke individual sessions or log out everywhere.",
    "updatedAt": "2026-07-25",
    "order": 80,
    "popularity": 28,
    "relatedIds": [
      "two-factor-auth",
      "passkeys",
      "delete-my-data"
    ]
  },
  {
    "id": "kittycoin-shop",
    "category": "account",
    "tags": [
      "kittycoins",
      "shop",
      "stickers",
      "frames"
    ],
    "title": "What are Kittycoins and the shop?",
    "answer": "Kittycoins are earned from watching, commenting, and login streaks. Spend them in the **Shop** on avatar frames, profile stickers, and username icons.\n\nOpen the shop from Settings or your profile customization.",
    "updatedAt": "2026-07-28",
    "order": 90,
    "popularity": 32,
    "relatedIds": [
      "levels-and-xp",
      "public-profile",
      "what-tipping-gives"
    ]
  },
  {
    "id": "how-streaming-works",
    "category": "watching",
    "tags": [
      "stream",
      "playback",
      "kittyapi",
      "sources",
      "episode"
    ],
    "title": "How does streaming work?",
    "answer": "When you open an episode, AniKitty asks KittyAPI for a stream using the anime's AniList ID, episode number, and your audio mode (Sub, Hard Subs, or Dub).\n\nSources appear as site codenames only — never the real host names. Default order starts with Juliet, then BD, Kilo, Taku, Megu, Uniform, Alpha, Gamma, Guard, GG, and Heaven.\n\nUse the compact picker or the full Sub / Hard Subs / Dub grid (**Settings → Playback → Simple source picker**). Turn on auto-fallback in player settings to try the next source when playback fails. Progress saves to your account when logged in.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 98,
    "relatedIds": [
      "stream-sources",
      "sub-hard-dub",
      "playback-fails"
    ]
  },
  {
    "id": "stream-sources",
    "category": "watching",
    "tags": [
      "providers",
      "juliet",
      "bd",
      "heaven",
      "sources"
    ],
    "title": "What are the stream sources?",
    "answer": "AniKitty does not host video — streams come through KittyAPI from third-party providers, shown only by site labels (1 Delta, 2 Vibe, 3 Kilo, 4 Sierra, 5 Juliet, 6 HQ, then BD, Ya, Taku, Megu, Uniform, Alpha, Gamma, Guard, GG, and Heaven).\n\n- The top six appear under **Recommended**\n- Soft Subs defaults to BD when available\n- Hard-sub only source is Heaven (Japanese audio only)\n\nNew watches use your Settings default source and fallback order; you can switch anytime while watching.",
    "updatedAt": "2026-07-29",
    "order": 20,
    "popularity": 75,
    "relatedIds": [
      "how-streaming-works",
      "sub-hard-dub",
      "playback-fails"
    ]
  },
  {
    "id": "sub-hard-dub",
    "category": "watching",
    "tags": [
      "sub",
      "dub",
      "hardsub",
      "audio",
      "captions"
    ],
    "title": "How do sub, hard subs, and dub work?",
    "answer": "The watch page splits sources into **Sub**, **Hard Subs**, and **Dub**:\n\n| Mode | What it does |\n| --- | --- |\n| Sub | Prefers soft-subtitle lines |\n| Hard Subs | Burn-in / hard-only sources (Heaven) |\n| Dub | English audio where the source supports it |\n\nHeaven has no dub. If you pick Dub but that episode has no dub file, AniKitty can fall back to Sub on the same source. Use player settings to auto-enable soft subtitles or overlay soft subs on hard-sub streams if needed.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 80,
    "relatedIds": [
      "subtitles-library",
      "stream-sources",
      "player-settings"
    ]
  },
  {
    "id": "player-settings",
    "category": "watching",
    "tags": [
      "settings",
      "anime4k",
      "quality",
      "speed",
      "dns",
      "theatre"
    ],
    "title": "What can I change in player settings?",
    "answer": "Open the gear icon in the player for **Playback**, **Captions**, **Quality**, **Speed**, **Display**, and **DNS**.\n\nTune auto-next, auto-skip, seek step, touch seek, Anime4K (WebGPU), theatre/lights, and source layout. Under DNS you can pin a location or stay on Auto (race healthy regions).\n\nOn phones the settings sheet stays compact so it does not cover the whole video.",
    "updatedAt": "2026-07-25",
    "order": 40,
    "popularity": 55,
    "relatedIds": [
      "how-streaming-works",
      "cast-to-tv",
      "playback-fails"
    ]
  },
  {
    "id": "cast-to-tv",
    "category": "watching",
    "tags": [
      "chromecast",
      "airplay",
      "tv",
      "cast"
    ],
    "title": "Can I cast to my TV?",
    "answer": "Yes.\n\n- **Chromecast** (Cast button) works on supported browsers and remints a TV-friendly stream URL\n- **AirPlay** (Safari / iOS / macOS) uses the AirPlay button — AniKitty switches to a native stream before connecting so Apple TV is not stuck on a black screen\n\nCasting needs a public HTTPS site; localhost and private URLs cannot reach the TV.",
    "updatedAt": "2026-07-25",
    "order": 50,
    "popularity": 50,
    "relatedIds": [
      "player-settings",
      "playback-fails",
      "how-streaming-works"
    ]
  },
  {
    "id": "subtitles-library",
    "category": "watching",
    "tags": [
      "subtitles",
      "captions",
      "soft subs",
      "library"
    ],
    "title": "Subtitles and the subtitle library",
    "answer": "In Sub mode, the player loads soft subtitle tracks when the source includes them. Hard-sub streams already have text burned in — enable soft subs on hard-sub streams in player settings only if you want extra tracks on top.\n\nCustomize appearance and timing in Captions / Settings. The **Subtitle Library** lists tracks cached when you watch episodes — use refresh on that page to fetch more.",
    "updatedAt": "2026-07-25",
    "order": 60,
    "popularity": 48,
    "relatedIds": [
      "sub-hard-dub",
      "player-settings",
      "stream-sources"
    ]
  },
  {
    "id": "schedule-and-trending",
    "category": "watching",
    "tags": [
      "schedule",
      "airing",
      "trending",
      "upcoming"
    ],
    "title": "What are Schedule and Trending?",
    "answer": "**Schedule** shows what is airing this week in your local timezone.\n\n**Trending** highlights popular and upcoming titles from the catalog feed.",
    "updatedAt": "2026-07-25",
    "order": 70,
    "popularity": 34,
    "relatedIds": [
      "how-search-works",
      "recommendations",
      "what-is-anikitty"
    ]
  },
  {
    "id": "watch-together",
    "category": "watching",
    "tags": [
      "w2g",
      "party",
      "sync",
      "room"
    ],
    "title": "Watch Together",
    "answer": "Open a room from any episode with **Watch Together** — it appears on the Watch Together page for anyone to join.\n\nHosts can delete their room when done; guests leave without closing it. Playback stays synced and you can chat in the room panel.",
    "updatedAt": "2026-07-25",
    "order": 80,
    "popularity": 42,
    "relatedIds": [
      "live-chat",
      "how-streaming-works",
      "do-i-need-an-account"
    ]
  },
  {
    "id": "recommendations",
    "category": "watching",
    "tags": [
      "recommended",
      "for you",
      "related"
    ],
    "title": "How do recommendations work?",
    "answer": "When signed in with some watch history, the home page shows a **Recommended for you** row based on related titles from the catalog.\n\nNew accounts see a prompt to start watching first.",
    "updatedAt": "2026-07-25",
    "order": 90,
    "popularity": 33,
    "relatedIds": [
      "continue-watching",
      "watch-history",
      "how-search-works"
    ]
  },
  {
    "id": "how-watchlists-work",
    "category": "watchlists",
    "tags": [
      "watchlist",
      "lists",
      "planning",
      "completed"
    ],
    "title": "How do watchlists work?",
    "answer": "Signed-in users get watchlist lists (Planning, Watching, Completed, and more) on their profile and anime pages.\n\nAdd or change status from an anime page or your library. Lists are public on your profile unless **Ninja mode** is on.",
    "updatedAt": "2026-07-28",
    "order": 10,
    "popularity": 60,
    "relatedIds": [
      "anilist-sync",
      "ninja-mode",
      "watch-history"
    ]
  },
  {
    "id": "anilist-sync",
    "category": "watchlists",
    "tags": [
      "anilist",
      "import",
      "sync",
      "mal",
      "myanimelist"
    ],
    "title": "Can I sync my list from AniList?",
    "answer": "Yes. In **Settings → Connections**, connect AniList via OAuth and import your library into your AniKitty watchlist.\n\nOn anime pages you can also rate titles straight to AniList (0.5–10, e.g. 6.5). MyAnimeList account sign-in was removed — use AniList for list sync. Anime pages still show MyAnimeList metadata (score, rank, popularity, etc.) for reference.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 65,
    "relatedIds": [
      "how-watchlists-work",
      "how-ratings-work",
      "do-i-need-an-account"
    ]
  },
  {
    "id": "continue-watching",
    "category": "history",
    "tags": [
      "continue",
      "resume",
      "progress"
    ],
    "title": "What is Continue Watching?",
    "answer": "When signed in, the home page and your profile show titles you started recently so you can jump back in.\n\nProgress is stored in the database and cached locally in your browser for faster resume. You can also open the full **Watch History** page from the account menu.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 72,
    "relatedIds": [
      "watch-history",
      "recently-viewed",
      "how-streaming-works"
    ]
  },
  {
    "id": "watch-history",
    "category": "history",
    "tags": [
      "history",
      "dashboard",
      "heatmap",
      "stats"
    ],
    "title": "Where is my watch history?",
    "answer": "Open **My List / History** from the account menu or footer. The dashboard shows continue watching, stats, a heatmap, calendar, and every episode you've played.\n\nProgress syncs when you're signed in. Guests can still resume locally in the current browser.",
    "updatedAt": "2026-07-28",
    "order": 20,
    "popularity": 58,
    "relatedIds": [
      "continue-watching",
      "recently-viewed",
      "how-watchlists-work"
    ]
  },
  {
    "id": "recently-viewed",
    "category": "history",
    "tags": [
      "recent",
      "browsing",
      "local"
    ],
    "title": "What is the Recently viewed row?",
    "answer": "The home page keeps a local list of anime you opened recently so you can jump back to something you were browsing.\n\nIt is stored only in your browser and is separate from Continue Watching.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 30,
    "relatedIds": [
      "continue-watching",
      "browser-storage",
      "watch-history"
    ]
  },
  {
    "id": "live-chat",
    "category": "chat",
    "tags": [
      "chat",
      "live",
      "gif",
      "messages"
    ],
    "title": "Live chat",
    "answer": "Live chat is real-time and requires an account. Messages auto-delete after a short time.\n\nYou can edit or delete your own messages, search GIFs inline, and links in messages are clickable.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 52,
    "relatedIds": [
      "forum",
      "episode-comments",
      "notifications"
    ]
  },
  {
    "id": "forum",
    "category": "chat",
    "tags": [
      "forum",
      "threads",
      "polls",
      "announcements"
    ],
    "title": "Forum",
    "answer": "The forum is for longer discussions — threads, replies, polls, and staff announcements. Content is stored until moderators remove it.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 40,
    "relatedIds": [
      "live-chat",
      "episode-comments",
      "moderation"
    ]
  },
  {
    "id": "episode-comments",
    "category": "chat",
    "tags": [
      "comments",
      "spoilers",
      "mentions",
      "gifs"
    ],
    "title": "Episode comments",
    "answer": "On the watch page you can leave text and optional GIF comments per episode or for the whole anime when signed in.\n\nComments support:\n\n- `@mentions`\n- Clickable timestamps that jump the player\n- `||inline spoilers||`\n\nUse **···** on a comment to copy its link or report it. Moderators can pin a comment. Sort by New, Best, Top, or Old. On phones, open Comments from the preview card under the player.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 54,
    "relatedIds": [
      "report-comment",
      "notifications",
      "live-chat"
    ]
  },
  {
    "id": "follow-and-friends",
    "category": "chat",
    "tags": [
      "follow",
      "friends",
      "social"
    ],
    "title": "Following and friends",
    "answer": "**Following** is one-way — open someone's profile and tap Follow. You get a notification when someone follows you.\n\n**Friends** are mutual: send a request from their profile, accept or decline incoming requests, and unfriend anytime. Both users get notified when you become friends.",
    "updatedAt": "2026-07-25",
    "order": 40,
    "popularity": 44,
    "relatedIds": [
      "notifications",
      "block-users",
      "public-profile"
    ]
  },
  {
    "id": "block-users",
    "category": "chat",
    "tags": [
      "block",
      "privacy",
      "safety"
    ],
    "title": "Can I block someone?",
    "answer": "Yes. Use the **Block** button on a user's profile. Blocking hides their comments from you and stops them from messaging or following you.\n\nManage your blocked list in **Settings → Privacy**.",
    "updatedAt": "2026-07-25",
    "order": 50,
    "popularity": 35,
    "relatedIds": [
      "report-comment",
      "ninja-mode",
      "follow-and-friends"
    ]
  },
  {
    "id": "report-comment",
    "category": "chat",
    "tags": [
      "report",
      "moderation",
      "abuse"
    ],
    "title": "How do I report a comment?",
    "answer": "Open **···** on any comment and choose **Report** to send it to moderators. Reports go into a moderation queue where staff can resolve or dismiss them.",
    "updatedAt": "2026-07-25",
    "order": 60,
    "popularity": 37,
    "relatedIds": [
      "moderation",
      "block-users",
      "episode-comments"
    ]
  },
  {
    "id": "how-search-works",
    "category": "search",
    "tags": [
      "search",
      "catalog",
      "find",
      "query"
    ],
    "title": "How does search work?",
    "answer": "Use the main **Search** page or navbar search to find anime by title. Results also include **voice actors** when your query matches a name.\n\nFilters and trending/new pages help when you're browsing instead of looking for a specific title.",
    "updatedAt": "2026-07-28",
    "order": 10,
    "popularity": 46,
    "relatedIds": [
      "voice-actors",
      "schedule-and-trending",
      "recommendations"
    ]
  },
  {
    "id": "voice-actors",
    "category": "search",
    "tags": [
      "seiyuu",
      "va",
      "cast",
      "filmography"
    ],
    "title": "Can I look up voice actors?",
    "answer": "Yes. Open any anime and use the **Voice Actors** tab, or click a voice actor to open their page with their complete filmography.\n\nYou can also search voice actors by name in the main Search — results show Anime and Voice Actors together.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 41,
    "relatedIds": [
      "how-search-works",
      "how-streaming-works"
    ]
  },
  {
    "id": "how-ratings-work",
    "category": "ratings",
    "tags": [
      "rate",
      "score",
      "review",
      "anilist"
    ],
    "title": "How do ratings and reviews work?",
    "answer": "On anime pages you can rate titles (including half steps like 6.5) and write reviews when signed in.\n\nIf AniList is connected, you can push scores straight to AniList. Site scores and reviews also appear on profiles and community surfaces.",
    "updatedAt": "2026-07-28",
    "order": 10,
    "popularity": 43,
    "relatedIds": [
      "anilist-sync",
      "episode-comments",
      "achievements"
    ]
  },
  {
    "id": "notifications",
    "category": "notifications",
    "tags": [
      "bell",
      "mentions",
      "replies",
      "dm",
      "alerts"
    ],
    "title": "How do notifications work?",
    "answer": "The bell in the navbar shows unread mentions, replies, new followers, friend requests, and direct messages.\n\nMark everything read from the dropdown, and choose which types you receive in **Settings → Notifications**.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 47,
    "relatedIds": [
      "follow-and-friends",
      "episode-comments",
      "live-chat"
    ]
  },
  {
    "id": "is-kofi-required",
    "category": "premium",
    "tags": [
      "kofi",
      "donate",
      "tip",
      "optional"
    ],
    "title": "Is Ko-fi support required?",
    "answer": "No. The site is free whether you donate or not. Tips are optional — they grant the donator rank and badge while active, and they help cover costs.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 62,
    "relatedIds": [
      "what-tipping-gives",
      "is-anikitty-free",
      "what-is-anikitty"
    ]
  },
  {
    "id": "what-tipping-gives",
    "category": "premium",
    "tags": [
      "donator",
      "badge",
      "kofi",
      "tip"
    ],
    "title": "What does tipping give me?",
    "answer": "Every **€4** with your `@username` in the Ko-fi message ≈ **30 days** of donator rank (badge on your profile and comments). €8 ≈ 60 days, and so on.\n\nWatching stays free and ad-free for everyone either way. Activate from the Donate page or ask moderators if a tip did not match automatically.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 68,
    "relatedIds": [
      "is-kofi-required",
      "is-anikitty-free",
      "public-profile"
    ]
  },
  {
    "id": "playback-fails",
    "category": "troubleshooting",
    "tags": [
      "error",
      "buffering",
      "source",
      "fallback",
      "dns"
    ],
    "title": "Video won't play or keeps buffering",
    "answer": "Try these steps:\n\n1. Switch to another source in the picker (or enable **auto-fallback**)\n2. Change audio mode (Sub / Hard Subs / Dub)\n3. Open player **DNS** settings and try Auto or another region\n4. Check the [Status](/status) page for node health\n5. Hard-refresh the page or try another browser\n\nCasting and some sources need a public HTTPS site — localhost often fails for TV cast.",
    "updatedAt": "2026-07-28",
    "order": 10,
    "popularity": 85,
    "relatedIds": [
      "how-streaming-works",
      "stream-sources",
      "player-settings"
    ]
  },
  {
    "id": "cast-black-screen",
    "category": "troubleshooting",
    "tags": [
      "airplay",
      "chromecast",
      "black",
      "tv"
    ],
    "title": "Cast shows a black screen",
    "answer": "For AirPlay, use the in-player AirPlay control so AniKitty can switch to a native stream before connecting.\n\nChromecast needs a supported browser and a reminted TV-friendly URL. Private/local URLs cannot reach the TV — use the public site over HTTPS.",
    "updatedAt": "2026-07-28",
    "order": 20,
    "popularity": 49,
    "relatedIds": [
      "cast-to-tv",
      "playback-fails",
      "player-settings"
    ]
  },
  {
    "id": "rate-limiting",
    "category": "troubleshooting",
    "tags": [
      "rate limit",
      "429",
      "too many",
      "abuse"
    ],
    "title": "Why am I rate limited?",
    "answer": "Sensitive actions (sign-up, login, posting, reporting) are rate-limited by IP and/or user ID to reduce abuse.\n\nWait a short time and try again. Persistent issues may mean a shared network — contact Discord moderators if it keeps happening.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 29,
    "relatedIds": [
      "moderation",
      "password-protection",
      "how-create-account"
    ]
  },
  {
    "id": "privacy-data-stored",
    "category": "general",
    "tags": [
      "privacy",
      "data",
      "gdpr",
      "storage"
    ],
    "title": "What data does AniKitty store about me?",
    "answer": "Account info (username, email, password hash, profile customization), watch data (watchlist, progress, history), community content (chat, forum, comments, messages), social graph (follows, friends, blocks), session records, achievements, Kittycoin balance, and preferences like Ninja mode.",
    "updatedAt": "2026-07-25",
    "order": 10,
    "popularity": 56,
    "relatedIds": [
      "browser-storage",
      "delete-my-data",
      "third-parties"
    ]
  },
  {
    "id": "browser-storage",
    "category": "general",
    "tags": [
      "localstorage",
      "cookie",
      "cache",
      "browser"
    ],
    "title": "What is stored only in my browser?",
    "answer": "Session cookie, player and UI settings, progress cache, recently viewed anime, online heartbeat ID, level stats cache, and subtitle appearance preferences.",
    "updatedAt": "2026-07-25",
    "order": 20,
    "popularity": 31,
    "relatedIds": [
      "cookies",
      "privacy-data-stored",
      "recently-viewed"
    ]
  },
  {
    "id": "third-parties",
    "category": "general",
    "tags": [
      "analytics",
      "google",
      "anilist",
      "kittyapi"
    ],
    "title": "Analytics and third parties",
    "answer": "Google Analytics for page views, KittyAPI for streams, AniList if you connect it, optional Anisurge if you link an account, and external Discord/GitHub/Ko-fi/Telegram links.",
    "updatedAt": "2026-07-25",
    "order": 30,
    "popularity": 27,
    "relatedIds": [
      "privacy-data-stored",
      "what-we-dont-do",
      "cookies"
    ]
  },
  {
    "id": "what-we-dont-do",
    "category": "general",
    "tags": [
      "ads",
      "sell",
      "hosting"
    ],
    "title": "What we do not do",
    "answer": "AniKitty does **not** sell your personal data, does **not** show ads, and does **not** host video files on its servers.",
    "updatedAt": "2026-07-25",
    "order": 40,
    "popularity": 39,
    "relatedIds": [
      "is-anikitty-free",
      "privacy-data-stored",
      "what-is-anikitty"
    ]
  },
  {
    "id": "delete-my-data",
    "category": "general",
    "tags": [
      "delete",
      "account deletion",
      "remove"
    ],
    "title": "How can I delete my data?",
    "answer": "Go to **Settings → Privacy → Account deletion** to request permanent removal.\n\nYou can also revoke sessions, disconnect AniList, and manage blocked users before deleting.",
    "updatedAt": "2026-07-25",
    "order": 50,
    "popularity": 42,
    "relatedIds": [
      "privacy-data-stored",
      "active-sessions",
      "ninja-mode"
    ]
  },
  {
    "id": "cookies",
    "category": "general",
    "tags": [
      "cookies",
      "https",
      "session"
    ],
    "title": "Cookies",
    "answer": "Sign-in uses an HttpOnly session cookie. Stream playback uses a short-lived playback session cookie for the HLS proxy. Google Analytics may set its own cookies. The site enforces HTTPS in production.",
    "updatedAt": "2026-07-25",
    "order": 60,
    "popularity": 26,
    "relatedIds": [
      "browser-storage",
      "https-encrypted",
      "privacy-data-stored"
    ]
  },
  {
    "id": "password-protection",
    "category": "general",
    "tags": [
      "bcrypt",
      "jwt",
      "password",
      "security"
    ],
    "title": "How is my password protected?",
    "answer": "Passwords are hashed with bcrypt. Login issues a signed JWT in an HttpOnly session cookie. Passkeys use the WebAuthn standard and never send your biometric data to our servers.",
    "updatedAt": "2026-07-25",
    "order": 70,
    "popularity": 33,
    "relatedIds": [
      "passkeys",
      "two-factor-auth",
      "https-encrypted"
    ]
  },
  {
    "id": "https-encrypted",
    "category": "general",
    "tags": [
      "https",
      "tls",
      "encryption"
    ],
    "title": "Is traffic encrypted?",
    "answer": "Yes — use the site over HTTPS. HTTP requests redirect to HTTPS in production.",
    "updatedAt": "2026-07-25",
    "order": 80,
    "popularity": 25,
    "relatedIds": [
      "cookies",
      "password-protection",
      "cast-to-tv"
    ]
  },
  {
    "id": "moderation",
    "category": "general",
    "tags": [
      "mods",
      "admins",
      "staff"
    ],
    "title": "Moderation",
    "answer": "Admins and moderators can manage forum content, live chat, comment reports, and user roles. Staff announcements appear in the forum.",
    "updatedAt": "2026-07-25",
    "order": 90,
    "popularity": 24,
    "relatedIds": [
      "report-comment",
      "forum",
      "rate-limiting"
    ]
  },
  {
    "id": "online-counter",
    "category": "general",
    "tags": [
      "online",
      "presence",
      "count"
    ],
    "title": "What does the online counter mean?",
    "answer": "The online badge counts unique browsers currently on the site — guests and signed-in users — based on a short heartbeat from every page. It is not a list of usernames.",
    "updatedAt": "2026-07-25",
    "order": 100,
    "popularity": 22,
    "relatedIds": [
      "browser-storage",
      "what-is-anikitty"
    ]
  }
];
