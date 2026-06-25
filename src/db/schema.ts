import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  unique,
  index,
  doublePrecision,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 25 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  bio: text("bio"),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  anisurgeToken: text("anisurge_token"),
  anisurgeUsername: varchar("anisurge_username", { length: 100 }),
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

export const skipCache = pgTable("skip_cache", {
  cacheKey:   varchar("cache_key", { length: 255 }).primaryKey(),
  introStart: doublePrecision("intro_start"),
  introEnd:   doublePrecision("intro_end"),
  outroStart: doublePrecision("outro_start"),
  outroEnd:   doublePrecision("outro_end"),
  fetchedAt:  timestamp("fetched_at").defaultNow(),
});

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    animeId: varchar("anime_id", { length: 255 }).notNull(),
    body: text("body").notNull().default(""),
    gifUrl: text("gif_url"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (t) => ({
    animeIdx: index("comments_anime_id_idx").on(t.animeId),
  }),
);
