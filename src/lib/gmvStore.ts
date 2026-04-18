import { create } from "zustand";
import { TikTokRow } from "@/utils/gmvAnalyzer";

interface GMVState {
  fileName: string | null;
  data: TikTokRow[];
  isLoading: boolean;
  setData: (fileName: string, data: TikTokRow[]) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useGMVStore = create<GMVState>((set) => ({
  fileName: null,
  data: [],
  isLoading: false,
  setData: (fileName, data) => set({ fileName, data, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () => set({ fileName: null, data: [], isLoading: false }),
}));
