"use client";

import React, { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";
import { KittyStreamSupersededError } from "@/query/stream/get-kitty-stream";

type Props = {
  children: ReactNode;
};

function isSupersededStreamError(error: unknown): boolean {
  return error instanceof KittyStreamSupersededError;
}

const QueryProvider = (props: Props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            cacheTime: 5 * 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
            onError: (error) => {
              if (isSupersededStreamError(error)) return;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
