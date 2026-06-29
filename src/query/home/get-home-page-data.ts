import { GET_HOME_PAGE_DATA } from "@/constants/query-keys";
import { api } from "@/lib/core/api";
import { IAnimeData } from "@/types/anime";
import { useQuery } from "react-query";

const getHomePageData = async () => {
    const res = await api.get("/api/home");
    return res.data.data as IAnimeData;
};

export const useGetHomePageData = () => {
    return useQuery({
        queryFn: getHomePageData,
        queryKey: [GET_HOME_PAGE_DATA],
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        staleTime: 1000 * 60 * 10,
        cacheTime: 1000 * 60 * 30,
    });
};
