// src/features/history/model/historyStore.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { usePixelStore } from '@/features/pixel-board/model/pixelStore';

interface HistoryState {
  past: string[][][];
  future: string[][][];
  undo: () => void;
  redo: () => void;
  push: (newPixels: string[][]) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  devtools(
    (set, get) => ({
      past: [],
      future: [],

      undo: () => {
        const { past, future } = get();
        const pixelStore = usePixelStore.getState();

        if (past.length === 0) return;

        const previous = past[past.length - 1];

        set({
          past: past.slice(0, -1),
          future: [pixelStore.pixels.map((row) => [...row]), ...future],
        });

        // Update pixel store to restore the previous state
        pixelStore.setPixels(previous.map((row) => [...row]));
      },

      redo: () => {
        const { past, future } = get();
        const pixelStore = usePixelStore.getState();

        if (future.length === 0) return;

        const next = future[0];

        set({
          past: [...past, pixelStore.pixels.map((row) => [...row])],
          future: future.slice(1),
        });

        // Update pixel store to restore the next state
        pixelStore.setPixels(next.map((row) => [...row]));
      },

      push: (newPixels) => {
        const { past } = get();

        // Deep copy to prevent reference issues
        const deepCopy = newPixels.map((row) => [...row]);

        set({
          past: [...past, deepCopy],
          future: [], // Clear redo stack whenever a new action is added
        });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'HistoryStore' }
  )
);
