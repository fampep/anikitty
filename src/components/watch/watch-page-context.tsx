"use client";

import { createContext, useContext } from "react";

type WatchPageContextValue = {
  openComments: (scope?: "episode" | "anime") => void;
  mobilePlaylistOpen: boolean;
  toggleMobilePlaylist: () => void;
  setMobilePlaylistOpen: (open: boolean) => void;
};

const WatchPageContext = createContext<WatchPageContextValue | null>(null);

export function WatchPageProvider({
  openComments,
  mobilePlaylistOpen,
  toggleMobilePlaylist,
  setMobilePlaylistOpen,
  children,
}: {
  openComments: (scope?: "episode" | "anime") => void;
  mobilePlaylistOpen: boolean;
  toggleMobilePlaylist: () => void;
  setMobilePlaylistOpen: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <WatchPageContext.Provider
      value={{
        openComments,
        mobilePlaylistOpen,
        toggleMobilePlaylist,
        setMobilePlaylistOpen,
      }}
    >
      {children}
    </WatchPageContext.Provider>
  );
}

export function useWatchPage() {
  return useContext(WatchPageContext);
}
