import { useHistoryStore } from '@/features/history/model/historyStore';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  pixels: string[][];
}

interface LayerStoreState {
  layers: Layer[];
  activeLayerId: string;
  addLayer: (width: number, height: number, name?: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerPixels: (id: string, pixels: string[][]) => void;
  toggleVisibility: (id: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerName: (id: string, name: string) => void;
}

export const useLayerStore = create<LayerStoreState>()(
  devtools(
    (set, get) => {
      const defaultWidth = 32;
      const defaultHeight = 32;
      const defaultPixels = Array.from({ length: defaultHeight }, () =>
        Array.from({ length: defaultWidth }, () => 'transparent')
      );
      const defaultLayer: Layer = {
        id: Date.now().toString(),
        name: 'Layer 1',
        visible: true,
        pixels: defaultPixels,
      };

      const pushHistory = () => {
        useHistoryStore.getState().push();
      };

      return {
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,

        addLayer: (width, height, name = 'Layer') => {
          const emptyPixels = Array.from({ length: height }, () =>
            Array.from({ length: width }, () => 'transparent')
          );
          const newLayer: Layer = {
            id: Date.now().toString(),
            name: `${name} ${get().layers.length + 1}`,
            visible: true,
            pixels: emptyPixels,
          };
          set((state) => {
            const layers = [...state.layers, newLayer];
            pushHistory();
            return { layers, activeLayerId: newLayer.id };
          });
        },

        removeLayer: (id) => {
          set((state) => {
            const layers = state.layers.filter((l) => l.id !== id);

            const activeLayerId =
              state.activeLayerId === id
                ? (layers[0]?.id ?? null)
                : state.activeLayerId;

            // Ensure at least one layer remains
            if (layers.length === 0) {
              const defaultLayer: Layer = {
                id: Date.now().toString(),
                name: 'Layer 1',
                visible: true,
                pixels: Array.from({ length: 32 }, () =>
                  Array.from({ length: 32 }, () => 'transparent')
                ),
              };
              pushHistory();
              return { layers: [defaultLayer], activeLayerId: defaultLayer.id };
            }

            pushHistory();
            return { layers, activeLayerId };
          });
        },

        setActiveLayer: (id) => set({ activeLayerId: id }),

        setLayerPixels: (id, pixels) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, pixels: pixels.map((r) => [...r]) } : l
            );
            return { layers };
          });
        },

        toggleVisibility: (id) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, visible: !l.visible } : l
            );
            pushHistory();
            return { layers };
          });
        },

        moveLayer: (fromIndex, toIndex) => {
          set((state) => {
            if (
              fromIndex < 0 ||
              fromIndex >= state.layers.length ||
              toIndex < 0 ||
              toIndex >= state.layers.length
            )
              return state;

            const newLayers = [...state.layers];
            const [moved] = newLayers.splice(fromIndex, 1);
            newLayers.splice(toIndex, 0, moved);

            pushHistory();
            return { layers: newLayers };
          });
        },

        setLayerName: (id, name) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, name } : l
            );
            pushHistory();
            return { layers };
          });
        },
      };
    },
    { name: 'LayerStore' }
  )
);
