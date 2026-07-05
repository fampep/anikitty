import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  unique,
  index,
  jsonb,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 25 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bio: text("bio"),
  themeColor: varchar("theme_color", { length: 7 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  supporterUntil: timestamp("supporter_until"),
  /** Click ads preference — synced across devices when signed in. */
  showAds: boolean("show_ads").notNull().default(true),
  /** Cross-device synced kitty-settings subset (json). */
  preferences: jsonb("preferences").$type<Record<string, unknown>>().notNull().default({}),
  anisurgeToken: text("anisurge_token"),
  anisurgeUsername: varchar("anisurge_username", { length: 100 }),
  anilistAccessToken: text("anilist_access_token"),
  anilistUserId: integer("anilist_user_id"),
  anilistUsername: varchar("anilist_username", { length: 100 }),
  discordId: varchar("discord_id", { length: 32 }),
  discordUsername: varchar("discord_username", { length: 100 }),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  profilePrivate: boolean("profile_private").notNull().default(false),
  bannedAt: timestamp("banned_at"),
  banReason: text("ban_reason"),
  bannedBy: uuid("banned_by"),
  mutedUntil: timestamp("muted_until"),
  muteReason: text("mute_reason"),
  mutedBy: uuid("muted_by"),
  kittycoinBalance: integer("kittycoin_balance").notNull().default(0),
  equippedFrame: varchar("equipped_frame", { length: 64 }),
  equippedSticker: varchar("equipped_sticker", { length: 64 }),
  equippedIcon: varchar("equipped_icon", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: text("user_agent"),
    deviceLabel: varchar("device_label", { length: 120 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    lastActiveAt: timestamp("last_active_at").defaultNow(),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("user_sessions_user_id_idx").on(t.userId),
  }),
);

export const userPasskeys = pgTable(
  "user_passkeys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    credentialId: text("credential_id").notNull().unique(),
    publicKey: text("public_key").notNull(),
    counter: integer("counter").notNull().default(0),
    deviceName: varchar("device_name", { length: 120 }).notNull().default("Passkey"),
    transports: text("transports"),
    backedUp: boolean("backed_up").notNull().default(false),
    deviceType: varchar("device_type", { length: 20 }),
    lastUsedAt: timestamp("last_used_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userIdx: index("user_passkeys_user_id_idx").on(t.userId),
  }),
);

export const watchlist = pgTable(
  "watchlist",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: varchar("anime_id", { length: 255 }).notNull(),
    folder: varchar("folder", { length: 20 }).notNull().default("WATCHING"),
    animeTitle: text("anime_title"),
    animeThumbnail: text("anime_thumbnail"),
    anilistId: integer("anilist_id"),
    malId: integer("mal_id"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userAnime: unique("watchlist_user_anime").on(t.userId, t.animeId),
  }),
);

export const watchProgress = pgTable(
  "watch_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: varchar("anime_id", { length: 255 }).notNull(),
    episodeId: varchar("episode_id", { length: 100 }).notNull(),
    currentTime: integer("current_time").notNull().default(0),
    duration: integer("duration").notNull().default(0),
    language: varchar("language", { length: 10 }).default("sub"),
    server: varchar("server", { length: 100 }),
    animeTitle: text("anime_title"),
    animeThumbnail: text("anime_thumbnail"),
    anilistId: integer("anilist_id"),
    anilistSyncedAt: timestamp("anilist_synced_at"),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userAnimeEp: unique("progress_user_anime_ep").on(t.userId, t.animeId, t.episodeId),
  }),
);

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  color: varchar("color", { length: 20 }).notNull().default("#ffffff"),
  permissions: jsonb("permissions").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: varchar("anime_id", { length: 255 }).notNull(),
    episodeId: varchar("episode_id", { length: 100 }),
    episodeNumber: integer("episode_number"),
    // Self-referential FK for replies. Top-level comments have parentId = null.
    parentId: uuid("parent_id").references((): any => comments.id, {
      onDelete: "cascade",
    }),
    body: text("body").notNull().default(""),
    gifUrl: text("gif_url"),
    isSpoiler: boolean("is_spoiler").notNull().default(false),
    // Set when a moderator pins a top-level comment to the top of the thread.
    pinnedAt: timestamp("pinned_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    animeIdx: index("comments_anime_id_idx").on(t.animeId),
    parentIdx: index("comments_parent_id_idx").on(t.parentId),
    animeEpisodeIdx: index("comments_anime_episode_idx").on(t.animeId, t.episodeId),
  }),
);

export const commentReactions = pgTable(
  "comment_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    emoji: varchar("emoji", { length: 16 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    commentUserEmoji: unique("comment_reactions_comment_user_emoji").on(t.commentId, t.userId, t.emoji),
  }),
);

export const commentVotes = pgTable(
  "comment_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: integer("vote").notNull(), // 1 = like, -1 = dislike
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    commentUser: unique("comment_votes_comment_user").on(t.commentId, t.userId),
  }),
);

// ── Forum ──────────────────────────────────────────────────────────────────
// Top-level discussion threads. `category` groups threads (general, recs, etc).
export const forumThreads = pgTable(
  "forum_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull().default(""),
    category: varchar("category", { length: 30 }).notNull().default("general"),
    isPinned: boolean("is_pinned").notNull().default(false),
    isLocked: boolean("is_locked").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
  },
  (t) => ({
    categoryIdx: index("forum_threads_category_idx").on(t.category),
    activityIdx: index("forum_threads_activity_idx").on(t.lastActivityAt),
  }),
);

// Replies/posts inside a thread.
export const forumPosts = pgTable(
  "forum_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull().default(""),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    threadIdx: index("forum_posts_thread_id_idx").on(t.threadId),
  }),
);

export const forumThreadVotes = pgTable(
  "forum_thread_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => forumThreads.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: integer("vote").notNull(), // 1 = upvote, -1 = downvote
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    threadUser: unique("forum_thread_votes_thread_user").on(t.threadId, t.userId),
  }),
);

export const forumPostVotes = pgTable(
  "forum_post_votes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => forumPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vote: integer("vote").notNull(), // 1 = upvote, -1 = downvote
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    postUser: unique("forum_post_votes_post_user").on(t.postId, t.userId),
  }),
);

// ── Live chat ──────────────────────────────────────────────────────────────
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    gifUrl: text("gif_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    createdIdx: index("chat_messages_created_at_idx").on(t.createdAt),
  }),
);

// ── Watch Together (W2G) ───────────────────────────────────────────────────
export const w2gRooms = pgTable(
  "w2g_rooms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 8 }).notNull().unique(),
    hostUserId: uuid("host_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: varchar("anime_id", { length: 255 }).notNull(),
    animeTitle: text("anime_title"),
    animeThumbnail: text("anime_thumbnail"),
    episodeId: varchar("episode_id", { length: 100 }).notNull(),
    episodeNumber: integer("episode_number").notNull().default(0),
    provider: varchar("provider", { length: 50 }).notNull().default("Miruro"),
    audio: varchar("audio", { length: 10 }).notNull().default("sub"),
    isPlaying: boolean("is_playing").notNull().default(false),
    currentTime: integer("current_time").notNull().default(0),
    stateVersion: integer("state_version").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    codeIdx: index("w2g_rooms_code_idx").on(t.code),
  }),
);

export const w2gMembers = pgTable(
  "w2g_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => w2gRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at").defaultNow(),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (t) => ({
    roomUser: unique("w2g_members_room_user").on(t.roomId, t.userId),
    roomIdx: index("w2g_members_room_id_idx").on(t.roomId),
  }),
);

export const w2gMessages = pgTable(
  "w2g_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roomId: uuid("room_id")
      .notNull()
      .references(() => w2gRooms.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    roomIdx: index("w2g_messages_room_id_idx").on(t.roomId),
  }),
);

// ── Announcements ──────────────────────────────────────────────────────────
// Site-wide banner messages managed by admins. Optional cross-post to forum.
export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull().default(""),
    severity: varchar("severity", { length: 20 }).notNull().default("info"), // info | warn | critical | success
    isActive: boolean("is_active").notNull().default(true),
    dismissible: boolean("dismissible").notNull().default(true),
    linkUrl: text("link_url"),
    linkLabel: varchar("link_label", { length: 60 }),
    forumThreadId: uuid("forum_thread_id").references(() => forumThreads.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    activeIdx: index("announcements_active_idx").on(t.isActive),
  }),
);

// ── Account deletion requests ──────────────────────────────────────────────
export const accountDeletionRequests = pgTable(
  "account_deletion_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason"),
    requestedAt: timestamp("requested_at").defaultNow(),
  },
  (t) => ({
    userUnique: unique("account_deletion_requests_user_id").on(t.userId),
  }),
);

// Cached sub/dub episode counts from Anikoto API (keyed by AniList ID).
export const animeAudioAvailability = pgTable("anime_audio_availability", {
  anilistId: integer("anilist_id").primaryKey(),
  malId: integer("mal_id"),
  catalogId: integer("catalog_id"),
  subCount: integer("sub_count").notNull().default(0),
  dubCount: integer("dub_count").notNull().default(0),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Cached subtitle tracks from KittyAPI stream responses (per provider/episode).
export const episodeSubtitles = pgTable(
  "episode_subtitles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    anilistId: integer("anilist_id").notNull(),
    animeTitle: text("anime_title"),
    episode: integer("episode").notNull(),
    audio: varchar("audio", { length: 10 }).notNull().default("sub"),
    provider: varchar("provider", { length: 50 }).notNull(),
    label: varchar("label", { length: 100 }).notNull(),
    kind: varchar("kind", { length: 30 }).notNull().default("subtitles"),
    isDefault: boolean("is_default").notNull().default(false),
    sourceUrl: text("source_url").notNull(),
    content: text("content").notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    uniqueTrack: unique("episode_subtitles_unique").on(
      t.anilistId,
      t.episode,
      t.audio,
      t.provider,
      t.label,
    ),
    lookupIdx: index("episode_subtitles_lookup_idx").on(
      t.anilistId,
      t.episode,
      t.audio,
      t.provider,
    ),
  }),
);

/** Per-anime summary for the subtitle library (posters, completion, counts). */
export const subtitleLibraryAnime = pgTable(
  "subtitle_library_anime",
  {
    anilistId: integer("anilist_id").primaryKey(),
    animeTitle: text("anime_title"),
    poster: text("poster"),
    status: varchar("status", { length: 30 }),
    totalEpisodes: integer("total_episodes"),
    cachedEpisodeCount: integer("cached_episode_count").notNull().default(0),
    trackCount: integer("track_count").notNull().default(0),
    isComplete: boolean("is_complete").notNull().default(false),
    score: integer("score"),
    year: integer("year"),
    lastSubtitleAt: timestamp("last_subtitle_at"),
    metaFetchedAt: timestamp("meta_fetched_at"),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    completeIdx: index("subtitle_library_anime_complete_idx").on(
      t.isComplete,
      t.lastSubtitleAt,
    ),
    titleIdx: index("subtitle_library_anime_title_idx").on(t.animeTitle),
  }),
);

// ── Direct messages ────────────────────────────────────────────────────────
export const dmConversations = pgTable(
  "dm_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    participantAId: uuid("participant_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    participantBId: uuid("participant_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastActivityAt: timestamp("last_activity_at").defaultNow(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pairUnique: unique("dm_conversations_pair").on(t.participantAId, t.participantBId),
    activityIdx: index("dm_conversations_activity_idx").on(t.lastActivityAt),
  }),
);

export const dmMessages = pgTable(
  "dm_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    gifUrl: text("gif_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at"),
  },
  (t) => ({
    convCreatedIdx: index("dm_messages_conv_created_idx").on(t.conversationId, t.createdAt),
  }),
);

export const dmReadState = pgTable(
  "dm_read_state",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => dmConversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastReadAt: timestamp("last_read_at").defaultNow(),
  },
  (t) => ({
    convUser: unique("dm_read_state_conv_user").on(t.conversationId, t.userId),
  }),
);

// ── User notifications ─────────────────────────────────────────────────────
export const userNotifications = pgTable(
  "user_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 30 }).notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    title: varchar("title", { length: 200 }),
    body: text("body"),
    linkUrl: text("link_url"),
    referenceType: varchar("reference_type", { length: 30 }),
    referenceId: uuid("reference_id"),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    userCreatedIdx: index("user_notifications_user_created_idx").on(t.userId, t.createdAt),
    userUnreadIdx: index("user_notifications_user_unread_idx").on(t.userId, t.readAt),
  }),
);

/** Server-wide secrets that must survive VPS redeploys (same Postgres). */
export const appSettings = pgTable("app_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/** Idempotency log for Ko-fi payment webhooks. */
export const kofiWebhookEvents = pgTable("kofi_webhook_events", {
  messageId: varchar("message_id", { length: 64 }).primaryKey(),
  kofiTransactionId: varchar("kofi_transaction_id", { length: 64 }),
  email: varchar("email", { length: 255 }),
  type: varchar("type", { length: 32 }),
  amount: varchar("amount", { length: 16 }),
  currency: varchar("currency", { length: 8 }),
  raw: jsonb("raw"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User subscriptions for new episode alerts (sub/dub) on airing anime.
export const animeEpisodeAlerts = pgTable(
  "anime_episode_alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    anilistId: integer("anilist_id").notNull(),
    animeTitle: text("anime_title"),
    animeThumbnail: text("anime_thumbnail"),
    notifySub: boolean("notify_sub").notNull().default(true),
    notifyDub: boolean("notify_dub").notNull().default(false),
    lastNotifiedSubEpisode: integer("last_notified_sub_episode").notNull().default(0),
    lastNotifiedDubEpisode: integer("last_notified_dub_episode").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (t) => ({
    userAnilist: unique("anime_episode_alerts_user_anilist").on(t.userId, t.anilistId),
    anilistIdx: index("anime_episode_alerts_anilist_idx").on(t.anilistId),
  }),
);

export const userShopItems = pgTable(
  "user_shop_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemSlug: varchar("item_slug", { length: 64 }).notNull(),
    purchasedAt: timestamp("purchased_at").defaultNow(),
  },
  (t) => ({
    userItem: unique("user_shop_items_user_slug").on(t.userId, t.itemSlug),
    userIdx: index("user_shop_items_user_id_idx").on(t.userId),
  }),
);

export const kittycoinLedger = pgTable(
  "kittycoin_ledger",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: varchar("reason", { length: 64 }).notNull(),
    referenceId: varchar("reference_id", { length: 128 }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    refUnique: unique("kittycoin_ledger_user_reason_ref").on(
      t.userId,
      t.reason,
      t.referenceId,
    ),
    userIdx: index("kittycoin_ledger_user_id_idx").on(t.userId),
  }),
);

// ── Moderation ──────────────────────────────────────────────────────────────
// Immutable log of staff actions (bans, mutes, comment deletes, pins, etc).
export const modAuditLog = pgTable(
  "mod_audit_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 40 }).notNull(),
    targetType: varchar("target_type", { length: 20 }),
    targetId: varchar("target_id", { length: 255 }),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    createdIdx: index("mod_audit_log_created_idx").on(t.createdAt),
    actorIdx: index("mod_audit_log_actor_idx").on(t.actorUserId),
  }),
);

// Directed social graph: followerId follows followingId.
export const userFollows = pgTable(
  "user_follows",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    followerId: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    pair: unique("user_follows_pair").on(t.followerId, t.followingId),
    followingIdx: index("user_follows_following_idx").on(t.followingId),
    followerIdx: index("user_follows_follower_idx").on(t.followerId),
  }),
);

// User reports of comments/users, resolved from the moderation queue.
export const userReports = pgTable(
  "user_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reporterUserId: uuid("reporter_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: varchar("target_type", { length: 20 }).notNull(), // comment | user
    targetId: varchar("target_id", { length: 255 }).notNull(),
    targetUserId: uuid("target_user_id").references(() => users.id, { onDelete: "set null" }),
    reason: varchar("reason", { length: 40 }).notNull(),
    details: text("details"),
    status: varchar("status", { length: 20 }).notNull().default("open"), // open | resolved | dismissed
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, { onDelete: "set null" }),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    statusIdx: index("user_reports_status_idx").on(t.status, t.createdAt),
    reporterTargetUnique: unique("user_reports_reporter_target").on(
      t.reporterUserId,
      t.targetType,
      t.targetId,
    ),
  }),
);
