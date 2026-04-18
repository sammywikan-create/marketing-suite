import { create } from 'zustand'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * In-memory store for raw uploaded File objects.
 * NOT persisted — File objects are not serializable.
 * Files are keyed by storeId and survive until page refresh.
 */
export interface RawFiles {
  overview?: File
  video?: File
  gmvMax?: File
  affiliateTikTok?: File
  affiliateTokopedia?: File
  affiliateTikTokCore?: File
  affiliateTokopediaCore?: File
}

interface RawFileState {
  files: Record<string, RawFiles>  // keyed by storeId
  setFile: (storeId: string, type: keyof RawFiles, file: File) => void
  getFiles: (storeId: string) => RawFiles
  clearFiles: (storeId: string) => void
}

export const useRawFileStore = create<RawFileState>()((set, get) => ({
  files: {},

  setFile: (storeId, type, file) =>
    set((state) => ({
      files: {
        ...state.files,
        [storeId]: {
          ...(state.files[storeId] || {}),
          [type]: file,
        },
      },
    })),

  getFiles: (storeId) => get().files[storeId] || {},

  clearFiles: (storeId) =>
    set((state) => {
      const { [storeId]: _, ...rest } = state.files
      return { files: rest }
    }),
}))
