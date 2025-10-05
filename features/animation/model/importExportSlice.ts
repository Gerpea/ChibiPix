import { useHistoryStore } from '@/features/history/model/historyStore';
import {
  exportAnimation,
  ExportProgress,
  importAnimation,
  ImportProgress,
} from '@/features/serialization/utils';
import { StateCreator } from 'zustand';
import { AnimationState, PersistedState } from './types';

interface ImportExportSlice {
  isImporting: boolean;
  exportAnimationData: (
    onProgress: (progress: ExportProgress) => void
  ) => Promise<string>;
  importAnimationData: (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => Promise<void>;
}

export const createImportExportSlice: StateCreator<
  AnimationState,
  [['zustand/devtools', never], ['zustand/persist', PersistedState]],
  [],
  ImportExportSlice
> = (set, get) => ({
  isImporting: false,

  exportAnimationData: async (
    onProgress: (progress: ExportProgress) => void
  ) => {
    const { frames, fps } = get();
    return await exportAnimation({ frames, fps }, onProgress);
  },

  importAnimationData: async (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => {
    const { frames, fps } = await importAnimation(data, onProgress);
    if (!frames || frames.length === 0) {
      throw new Error('Import failed: No frames found in the file.');
    }

    set({
      frames,
      fps,
      currentFrameIndex: 0,
      currentTime: 0,
      isPlaying: false,
      isImporting: true,
      timer: null,
    });
    useHistoryStore.getState().push();
  },
});
