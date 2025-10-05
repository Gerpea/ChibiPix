import { StateCreator } from 'zustand';
import { AnimationState, Frame, PersistedState } from './types';

interface PlaybackSlice {
  fps: number;
  isPlaying: boolean;
  timer: number | null;
  currentTime: number;
  setFps: (fps: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;
}

export const createPlaybackSlice: StateCreator<
  AnimationState,
  [['zustand/devtools', never], ['zustand/persist', PersistedState]],
  [],
  PlaybackSlice
> = (set, get) => ({
  fps: 12,
  isPlaying: false,
  timer: null,
  currentTime: 0,

  setFps: (fps: number) => {
    if (fps < 1) return;
    set({ fps });
    if (get().isPlaying) {
      get().pause();
      get().play();
    }
  },

  play: () => {
    if (get().frames.length === 0 || get().isPlaying) return;

    set({ isPlaying: true });

    let lastTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!get().isPlaying) return;

      lastTime = lastTime ?? currentTime;
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const state = get();
      const totalDuration = state.frames.reduce(
        (acc: number, f: Frame) => acc + f.duration,
        0
      );

      if (totalDuration === 0) {
        set({ isPlaying: false, timer: null });
        return;
      }

      let newCurrentTime = state.currentTime + deltaTime;
      if (newCurrentTime >= totalDuration) {
        newCurrentTime %= totalDuration;
      }

      let accumulatedDuration = 0;
      let newFrameIndex = 0;
      for (let i = 0; i < state.frames.length; i++) {
        accumulatedDuration += state.frames[i].duration;
        if (newCurrentTime < accumulatedDuration) {
          newFrameIndex = i;
          break;
        }
      }

      set({
        currentTime: newCurrentTime,
        currentFrameIndex: newFrameIndex,
        timer: requestAnimationFrame(animate),
      });
    };

    set({ timer: requestAnimationFrame(animate) });
  },

  pause: () => {
    set((state: AnimationState) => {
      if (!state.isPlaying || !state.timer) return state;
      cancelAnimationFrame(state.timer);
      return { isPlaying: false, timer: null };
    });
  },

  stop: () => {
    set((state: AnimationState) => {
      if (state.timer) cancelAnimationFrame(state.timer);
      return {
        isPlaying: false,
        timer: null,
        currentFrameIndex: 0,
        currentTime: 0,
      };
    });
  },

  setCurrentTime: (time: number) => {
    set((state: AnimationState) => {
      if (state.frames.length === 0) return state;
      const totalDuration = state.frames.reduce(
        (acc: number, f: Frame) => acc + f.duration,
        0
      );
      const bounded = Math.max(0, Math.min(totalDuration, time));
      let currentFrameIndex = 0;
      let accumulated = 0;

      for (let i = 0; i < state.frames.length; i++) {
        accumulated += state.frames[i].duration;
        if (bounded < accumulated) {
          currentFrameIndex = i;
          break;
        }
      }

      return { currentTime: bounded };
    });
  },
});
