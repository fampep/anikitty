export type WebhookCategory =
  | "platform"
  | "anime"
  | "episode"
  | "community"
  | "system"
  | "moderation";

export type WebhookEventDef = {
  type: string;
  category: WebhookCategory;
  title: string;
  description: string;
  color: number;
};

export const WEBHOOK_CATEGORIES: { value: WebhookCategory; label: string }[] = [
  { value: "platform", label: "Platform Events" },
  { value: "anime", label: "Anime Events" },
  { value: "episode", label: "Episode Events" },
  { value: "community", label: "Community Events" },
  { value: "system", label: "System Events" },
  { value: "moderation", label: "Moderation Events" },
];

export const WEBHOOK_EVENTS: WebhookEventDef[] = [
  // Platform
  { type: "user.registered", category: "platform", title: "New User Registered", description: "{username} joined the platform", color: 0x34d399 },
  { type: "user.verified", category: "platform", title: "User Verified", description: "{username} verified their email", color: 0x60a5fa },
  { type: "user.banned", category: "platform", title: "User Banned", description: "{username} was banned: {reason}", color: 0xef4444 },
  { type: "user.deleted", category: "platform", title: "User Deleted", description: "{username}'s account was deleted", color: 0x6b7280 },
  { type: "user.promoted", category: "platform", title: "User Promoted", description: "{username} was promoted to {role}", color: 0xfbbf24 },
  { type: "user.username_changed", category: "platform", title: "Username Changed", description: "{oldUsername} → {username}", color: 0x818cf8 },

  // Anime
  { type: "anime.added", category: "anime", title: "New Anime Added", description: "{animeTitle} was added to the catalog", color: 0x22d3ee },
  { type: "anime.updated", category: "anime", title: "Anime Updated", description: "{animeTitle} metadata was updated", color: 0x60a5fa },
  { type: "anime.rating_updated", category: "anime", title: "Rating Updated", description: "{animeTitle} rating: {rating}", color: 0xfbbf24 },

  // Episode
  { type: "episode.added", category: "episode", title: "New Episode Added", description: "{animeTitle} Episode {episodeNumber} is now available", color: 0x34d399 },
  { type: "episode.updated", category: "episode", title: "Episode Updated", description: "{animeTitle} Episode {episodeNumber} was updated", color: 0x60a5fa },
  { type: "episode.removed", category: "episode", title: "Episode Removed", description: "{animeTitle} Episode {episodeNumber} was removed", color: 0xef4444 },
  { type: "episode.dub_added", category: "episode", title: "Dub Added", description: "{animeTitle} Episode {episodeNumber} dub now available", color: 0xc084fc },
  { type: "episode.subtitles_added", category: "episode", title: "Subtitles Added", description: "{animeTitle} Episode {episodeNumber} subtitles added", color: 0x818cf8 },

  // Community
  { type: "review.created", category: "community", title: "New Review", description: "{username} reviewed {animeTitle}: {rating}/10", color: 0xfbbf24 },
  { type: "review.deleted", category: "community", title: "Review Deleted", description: "Review by {username} on {animeTitle} was deleted", color: 0xef4444 },
  { type: "comment.created", category: "community", title: "New Comment", description: "{username} commented on {animeTitle}", color: 0x818cf8 },
  { type: "comment.reported", category: "community", title: "Comment Reported", description: "Comment by {username} was reported", color: 0xf97316 },

  // System
  { type: "system.started", category: "system", title: "Server Started", description: "AniKitty server started at {timestamp}", color: 0x34d399 },
  { type: "system.maintenance", category: "system", title: "Maintenance Mode", description: "Server entered maintenance mode", color: 0xf97316 },
  { type: "system.backup", category: "system", title: "Backup Completed", description: "Database backup completed successfully", color: 0x22d3ee },
  { type: "system.error", category: "system", title: "API Error", description: "Error: {error}", color: 0xef4444 },

  // Moderation
  { type: "report.submitted", category: "moderation", title: "Report Submitted", description: "{username} reported {targetType}: {reason}", color: 0xf97316 },
  { type: "user.muted", category: "moderation", title: "User Muted", description: "{username} was muted: {reason}", color: 0xfbbf24 },
  { type: "content.removed", category: "moderation", title: "Content Removed", description: "{targetType} by {username} was removed", color: 0xef4444 },
  { type: "admin.login", category: "moderation", title: "Admin Login", description: "Admin panel accessed", color: 0x60a5fa },
];

export const WEBHOOK_EVENTS_BY_TYPE = new Map(WEBHOOK_EVENTS.map((e) => [e.type, e]));

export function interpolateTemplate(template: string, vars: Record<string, string | number | undefined>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? key));
}
