export type AnilistSiteEpisode = {
  number: number;
  title?: string;
  hasSub?: boolean;
  hasDub?: boolean;
  /** Opaque JSON from KittyAPI — pass unchanged to `/servers`. */
  dataIds?: string;
  url?: string;
};

export type AnilistSiteServer = {
  name: string;
  /** Opaque JSON from KittyAPI — pass unchanged to `/stream`. */
  id: string;
};
