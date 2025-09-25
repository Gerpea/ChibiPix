import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Frame,
  useAnimationStore,
} from '@/features/animation/model/animationStore';

const deepCloneFrames = (frames: Frame[]): Frame[] => {
  return frames.map((frame) => ({
    ...frame,
    layers: frame.layers.map((layer) => ({
      ...layer,
      pixels: new Map(layer.pixels),
    })),
  }));
};

interface HistorySnapshot {
  frames: Frame[];
  currentFrameIndex: number;
}

interface HistoryState {
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  push: () => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],

      push: () => {
        const { frames, currentFrameIndex } = useAnimationStore.getState();

        const newSnapshot: HistorySnapshot = {
          frames: deepCloneFrames(frames),
          currentFrameIndex,
        };

        set((state) => ({
          past: [...state.past, newSnapshot],
          future: [],
        }));
      },

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;

        const { frames: currentFrames, currentFrameIndex: currentFrameIdx } =
          useAnimationStore.getState();
        const presentSnapshot: HistorySnapshot = {
          frames: deepCloneFrames(currentFrames),
          currentFrameIndex: currentFrameIdx,
        };

        const previousSnapshot = past[past.length - 1];

        useAnimationStore.setState({
          frames: deepCloneFrames(previousSnapshot.frames),
          currentFrameIndex: previousSnapshot.currentFrameIndex,
        });

        set({
          past: past.slice(0, -1),
          future: [presentSnapshot, ...future],
        });
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;

        const { frames: currentFrames, currentFrameIndex: currentFrameIdx } =
          useAnimationStore.getState();
        const presentSnapshot: HistorySnapshot = {
          frames: deepCloneFrames(currentFrames),
          currentFrameIndex: currentFrameIdx,
        };

        const nextSnapshot = future[0];

        useAnimationStore.setState({
          frames: deepCloneFrames(nextSnapshot.frames),
          currentFrameIndex: nextSnapshot.currentFrameIndex,
        });

        set({
          past: [...past, presentSnapshot],
          future: future.slice(1),
        });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'HistoryStore' }
  )
);
