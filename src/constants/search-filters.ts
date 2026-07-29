export const types = [
  { value: "all", label: "All Types" },
  { value: "tv", label: "TV" },
  { value: "movie", label: "Movie" },
  { value: "ova", label: "OVA" },
  { value: "ona", label: "ONA" },
  { value: "special", label: "Special" },
  { value: "music", label: "Music" },
];

export const statuses = [
  { value: "currently-airing", label: "Airing" },
  { value: "finished-airing", label: "Finished" },
  { value: "not-yet-aired", label: "Upcoming" },
];

export const ratings = [
  { value: "g", label: "G" },
  { value: "pg", label: "PG" },
  { value: "pg-13", label: "PG-13" },
  { value: "r", label: "R" },
  { value: "r+", label: "R+" },
];

export const seasons = [
  { value: "winter", label: "Winter" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
];

export const languages = [
  { value: "sub", label: "Sub" },
  { value: "dub", label: "Dub" },
];

export const sort = [
  { value: "default", label: "Default" },
  { value: "score", label: "Top Rated" },
  { value: "most-watched", label: "Most Popular" },
  { value: "trending", label: "Trending" },
  { value: "recently-added", label: "Newest" },
  { value: "name-a-z", label: "A → Z" },
];

export const sources = [
  { value: "original", label: "Original" },
  { value: "manga", label: "Manga" },
  { value: "light_novel", label: "Light Novel" },
  { value: "visual_novel", label: "Visual Novel" },
  { value: "video_game", label: "Video Game" },
  { value: "novel", label: "Novel" },
  { value: "other", label: "Other" },
];

export const countries = [
  { value: "JP", label: "Japan" },
  { value: "KR", label: "South Korea" },
  { value: "CN", label: "China" },
  { value: "TW", label: "Taiwan" },
];

export const demographics = [
  { value: "shounen", label: "Shounen" },
  { value: "shoujo", label: "Shoujo" },
  { value: "seinen", label: "Seinen" },
  { value: "josei", label: "Josei" },
];

export const themes = [
  { value: "School", label: "School" },
  { value: "Military", label: "Military" },
  { value: "Isekai", label: "Isekai" },
  { value: "Vampire", label: "Vampire" },
  { value: "Samurai", label: "Samurai" },
  { value: "Space", label: "Space" },
  { value: "Music", label: "Music" },
  { value: "Martial Arts", label: "Martial Arts" },
  { value: "Historical", label: "Historical" },
  { value: "Tragedy", label: "Tragedy" },
  { value: "Gore", label: "Gore" },
  { value: "Psychological", label: "Psychological" },
];

export const episodeRanges = [
  { value: "1-1", label: "1 episode" },
  { value: "2-12", label: "2–12" },
  { value: "13-26", label: "13–26" },
  { value: "27-50", label: "27–50" },
  { value: "51+", label: "51+" },
];

export const runtimeRanges = [
  { value: "1-24", label: "≤ 24 min" },
  { value: "25-60", label: "25–60 min" },
  { value: "61-120", label: "1–2 hours" },
  { value: "121+", label: "2+ hours" },
];

export const scoreRanges = [
  { value: "90", label: "9.0+" },
  { value: "80", label: "8.0+" },
  { value: "70", label: "7.0+" },
  { value: "60", label: "6.0+" },
];

const CURRENT_YEAR = new Date().getFullYear();
const EARLIEST_YEAR = 1963;

export const years = Array.from({ length: CURRENT_YEAR - EARLIEST_YEAR + 1 }, (_, i) => {
  const year = String(CURRENT_YEAR - i);
  return { value: year, label: year };
});

export const decades = (() => {
  const list: { value: string; label: string }[] = [];
  const startDecade = Math.floor(EARLIEST_YEAR / 10) * 10;
  const endDecade = Math.floor(CURRENT_YEAR / 10) * 10;
  for (let d = endDecade; d >= startDecade; d -= 10) {
    list.push({ value: String(d), label: `${d}s` });
  }
  return list;
})();

// Genre values match AniList's title-case genre names (after slug→label conversion)
export const genres = [
  { value: "action", label: "Action" },
  { value: "adventure", label: "Adventure" },
  { value: "comedy", label: "Comedy" },
  { value: "drama", label: "Drama" },
  { value: "ecchi", label: "Ecchi" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror", label: "Horror" },
  { value: "mecha", label: "Mecha" },
  { value: "music", label: "Music" },
  { value: "mystery", label: "Mystery" },
  { value: "psychological", label: "Psychological" },
  { value: "romance", label: "Romance" },
  { value: "sci-fi", label: "Sci-Fi" },
  { value: "slice-of-life", label: "Slice of Life" },
  { value: "sports", label: "Sports" },
  { value: "supernatural", label: "Supernatural" },
  { value: "thriller", label: "Thriller" },
  { value: "harem", label: "Harem" },
  { value: "military", label: "Military" },
  { value: "school", label: "School" },
  { value: "shounen", label: "Shounen" },
  { value: "shoujo", label: "Shoujo" },
  { value: "seinen", label: "Seinen" },
  { value: "josei", label: "Josei" },
  { value: "isekai", label: "Isekai" },
  { value: "vampire", label: "Vampire" },
  { value: "samurai", label: "Samurai" },
  { value: "space", label: "Space" },
];
