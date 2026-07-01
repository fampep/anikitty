export interface IAnimeSchedule {
  scheduledAnimes: IAnimeScheduleItem[];
}

export interface IAnimeScheduleItem {
  id: string;
  name: string;
  jname: string;
  poster?: string | null;
  time: string;
  airingTimestamp: number;
  secondsUntilAiring: number;
  episode: number;
  /** Sub always airs on this schedule slot; dub included when that episode is out in dub. */
  audio: ("sub" | "dub")[];
}
