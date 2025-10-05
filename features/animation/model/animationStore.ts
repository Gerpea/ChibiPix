import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { createImportExportSlice } from './importExportSlice';
import { createLayerSlice } from './layerSlice';
import { createPlaybackSlice } from './playbackSlice';
import { createFrameSlice } from './frameSlice';
import { indexedDBStorage } from './persistedStorage';
import { AnimationState } from './types';

export const useAnimationStore = create<AnimationState>()(
  devtools(
    persist(
      (set, get) => ({
        // @ts-expect-error will fix later
        ...createFrameSlice(set, get),
        // @ts-expect-error will fix later
        ...createPlaybackSlice(set, get),
        // @ts-expect-error will fix later
        ...createLayerSlice(set, get),
        // @ts-expect-error will fix later
        ...createImportExportSlice(set, get),
      }),
      {
        name: 'animation-store',
        storage: indexedDBStorage,
        partialize: (state: AnimationState) => ({
          frames: state.frames,
          fps: state.fps,
        }),
      }
    ),
    { name: 'AnimationStore' }
  )
);
