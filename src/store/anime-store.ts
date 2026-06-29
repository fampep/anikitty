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
        if (prev?.anime?.info?.id === state?.anime?.info?.id) return;
        set({ anime: state });
    },

    selectedEpisode: '',
    setSelectedEpisode: (state: string) => {
        if (get().selectedEpisode === state) return;
        set({ selectedEpisode: state });
    },
}))
