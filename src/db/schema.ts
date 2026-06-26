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
  anisurgeToken: text("anisurge_token"),
  anisurgeUsername: varchar("anisurge_username", { length: 100 }),
  anilistAccessToken: text("anilist_access_token"),
  anilistUserId: integer("anilist_user_id"),
  anilistUsername: varchar("anilist_username", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});

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
