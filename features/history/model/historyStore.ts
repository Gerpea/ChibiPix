import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Layer, useLayerStore } from '@/features/layers/model/layerStore';

interface HistoryState {
  past: Layer[][];
  future: Layer[][];
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
        const layers = useLayerStore.getState().layers.map((l) => ({
          id: l.id,
          pixels: new Map(l.pixels), // Deep copy of Map
          visible: l.visible,
          name: l.name,
          width: l.width,
          height: l.height,
        }));
        set({ past: [...get().past, layers], future: [] });
      },

      undo: () => {
        const { past, future } = get();
        if (past.length === 0) return;

        const currentLayers = useLayerStore.getState().layers.map((l) => ({
          id: l.id,
          pixels: new Map(l.pixels), // Deep copy of Map
          visible: l.visible,
          name: l.name,
          width: l.width,
          height: l.height,
        }));

        const previous = past[past.length - 1] as Layer[];

        // Restore full layers array
        useLayerStore.setState({
          layers: previous.map((l) => ({
            id: l.id,
            pixels: new Map(l.pixels), // Deep copy of Map
            visible: l.visible,
            name: l.name,
            width: l.width,
            height: l.height,
          })),
          activeLayerId: previous[0]?.id ?? null,
        });

        set({ past: past.slice(0, -1), future: [currentLayers, ...future] });
      },

      redo: () => {
        const { past, future } = get();
        if (future.length === 0) return;

        const currentLayers = useLayerStore.getState().layers.map((l) => ({
          id: l.id,
          pixels: new Map(l.pixels), // Deep copy of Map
          visible: l.visible,
          name: l.name,
          width: l.width,
          height: l.height,
        }));

        const next = future[0] as Layer[];

        // Restore full layers array
        useLayerStore.setState({
          layers: next.map((l) => ({
            id: l.id,
            pixels: new Map(l.pixels),
            visible: l.visible,
            name: l.name,
            width: l.width,
            height: l.height,
          })),
          activeLayerId: next[0]?.id ?? null,
        });

        set({ past: [...past, currentLayers], future: future.slice(1) });
      },

      clear: () => set({ past: [], future: [] }),
    }),
    { name: 'HistoryStore' }
  )
);
