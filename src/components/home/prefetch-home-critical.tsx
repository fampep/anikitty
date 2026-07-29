"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GET_HOME_CRITICAL } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import type { HomeCriticalData } from "@/lib/core/home-data";

/**
 * Warm the critical home query as soon as the /home layout mounts,
 * before the heavy page tree finishes hydrating.
 */
export default function PrefetchHomeCritical() {
  const queryClient = useQueryClient();

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: [GET_HOME_CRITICAL],
      queryFn: async () => {
        const res = await api.get("/api/home?scope=critical");
        return res.data.data as HomeCriticalData;
      },
      staleTime: 1000 * 60 * 8,
    });
  }, [queryClient]);

  return null;
}
