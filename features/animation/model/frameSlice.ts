import { useHistoryStore } from '@/features/history/model/historyStore';
import { AnimationState, Frame, Layer, PersistedState } from './types';
import { StateCreator } from 'zustand';
import { deepCloneLayers } from './lib/utils';

interface FrameSlice {
  frames: Frame[];
  currentFrameIndex: number;
  addFrame: (duplicateCurrent?: boolean) => void;
  removeFrame: (index: number) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  setCurrentFrame: (index: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
}

export const createFrameSlice: StateCreator<
  AnimationState,
  [['zustand/devtools', never], ['zustand/persist', PersistedState]],
  [],
  FrameSlice
> = (set, get) => {
  const defaultLayer: Layer = {
    id: Date.now().toString(),
    name: 'Layer 1',
    visible: true,
    locked: false,
    pixels: new Map(),
  };

  const initialFrame: Frame = {
    id: Date.now().toString(),
    name: 'Frame 1',
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    duration: 1000 / 12,
  };

  return {
    frames: [initialFrame],
    currentFrameIndex: 0,

    addFrame: (duplicateCurrent = false) => {
      set((state: AnimationState) => {
        const currentFrame = state.frames[state.currentFrameIndex];
        let newLayers: Layer[] = [];
        let newActiveLayerId = '';

        if (duplicateCurrent) {
          const { layers: clonedLayers, idMap } = deepCloneLayers(
            currentFrame.layers
          );
          newLayers = clonedLayers;
          newActiveLayerId =
            idMap.get(currentFrame.activeLayerId) || clonedLayers[0]?.id || '';
        } else {
          const defaultLayer: Layer = {
            id: Date.now().toString(),
            name: 'Layer 1',
            visible: true,
            locked: false,
            pixels: new Map(),
          };
          newLayers = [defaultLayer];
          newActiveLayerId = defaultLayer.id;
        }

        const newFrame: Frame = {
          id: Date.now().toString(),
          name: `Frame ${state.frames.length + 1}`,
          layers: newLayers,
          activeLayerId: newActiveLayerId,
          duration: currentFrame?.duration ?? 1000 / 12,
        };

        const frames = [...state.frames, newFrame];
        useHistoryStore.getState().push();
        return { frames, currentFrameIndex: frames.length - 1 };
      });
    },

    removeFrame: (index: number) => {
      if (get().frames.length <= 1) return;
      set((state: AnimationState) => {
        const frames = state.frames.filter((_, i) => i !== index);
        let newIndex = state.currentFrameIndex;
        if (newIndex >= frames.length) {
          newIndex = frames.length - 1;
        }
        useHistoryStore.getState().push();
        return { frames, currentFrameIndex: newIndex };
      });
    },

    moveFrame: (fromIndex: number, toIndex: number) => {
      set((state: AnimationState) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.frames.length ||
          toIndex < 0 ||
          toIndex >= state.frames.length
        )
          return state;

        const frames = [...state.frames];
        const [moved] = frames.splice(fromIndex, 1);
        frames.splice(toIndex, 0, moved);

        let newCurrentIndex = state.currentFrameIndex;
        if (fromIndex === newCurrentIndex) {
          newCurrentIndex = toIndex;
        } else if (fromIndex < newCurrentIndex && toIndex >= newCurrentIndex) {
          newCurrentIndex--;
        } else if (fromIndex > newCurrentIndex && toIndex <= newCurrentIndex) {
          newCurrentIndex++;
        }

        useHistoryStore.getState().push();
        return { frames, currentFrameIndex: newCurrentIndex };
      });
    },

    setCurrentFrame: (index: number) => {
      set((state: AnimationState) => {
        if (index < 0 || index >= state.frames.length) return state;
        return { currentFrameIndex: index };
      });
    },

    setFrameDuration: (index: number, duration: number) => {
      if (duration < 1) return;
      set((state: AnimationState) => {
        const frames = [...state.frames];
        if (frames[index]) {
          frames[index].duration = duration;
          useHistoryStore.getState().push();
          return { frames };
        }
        return state;
      });
    },
  };
};
