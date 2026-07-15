import { create } from 'zustand'
import { IAnimeDetails } from '@/types/anime-details'

interface IAnimeStore {
    anime: IAnimeDetails,
    setAnime: (state: IAnimeDetails) => void
    selectedEpisode: string,
    setSelectedEpisode: (state: string) => void
}

export const useAnimeStore = create<IAnimeStore>((set, get) => ({
    anime: {} as IAnimeDetails,
    setAnime: (state: IAnimeDetails) => {
        const prev = get().anime;
        const prevId = prev?.anime?.info?.id;
        const nextId = state?.anime?.info?.id;
        if (prevId === nextId) return;
        set({ anime: state, selectedEpisode: "" });
    },

    selectedEpisode: '',
    setSelectedEpisode: (state: string) => {
        if (get().selectedEpisode === state) return;
        set({ selectedEpisode: state });
    },
}))
