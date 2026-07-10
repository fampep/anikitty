"use client";

import { createContext, useContext } from "react";

type WatchPageContextValue = {
  openComments: (scope?: "episode" | "anime") => void;
};

const WatchPageContext = createContext<WatchPageContextValue | null>(null);

export function WatchPageProvider({
  openComments,
  children,
}: {
  openComments: (scope?: "episode" | "anime") => void;
  children: React.ReactNode;
}) {
  return (
    <WatchPageContext.Provider value={{ openComments }}>
      {children}
    </WatchPageContext.Provider>
  );
}

export function useWatchPage() {
  return useContext(WatchPageContext);
}
