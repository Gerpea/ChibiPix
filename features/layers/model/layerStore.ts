import { useHistoryStore } from '@/features/history/model/historyStore';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  pixels: Map<string, number>;
  width: number;
  height: number;
}

interface LayerStoreState {
  layers: Layer[];
  activeLayerId: string;
  addLayer: (width: number, height: number, name?: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerPixels: (
    id: string,
    pixels: { x: number; y: number; color: number }[]
  ) => void;
  toggleVisibility: (id: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerName: (id: string, name: string) => void;
}

export const useLayerStore = create<LayerStoreState>()(
  devtools(
    (set, get) => {
      const defaultWidth = 32;
      const defaultHeight = 32;
      const defaultLayer: Layer = {
        id: Date.now().toString(),
        name: 'Layer 1',
        visible: true,
        pixels: new Map(), // Sparse storage, only non-transparent pixels
        width: defaultWidth,
        height: defaultHeight,
      };

      const pushHistory = () => {
        useHistoryStore.getState().push();
      };

      return {
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,

        addLayer: (width, height, name = 'Layer') => {
          const newLayer: Layer = {
            id: Date.now().toString(),
            name: `${name} ${get().layers.length + 1}`,
            visible: true,
            pixels: new Map(),
            width,
            height,
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

            if (layers.length === 0) {
              const defaultLayer: Layer = {
                id: Date.now().toString(),
                name: 'Layer 1',
                visible: true,
                pixels: new Map(),
                width: defaultWidth,
                height: defaultHeight,
              };
              pushHistory();
              return { layers: [defaultLayer], activeLayerId: defaultLayer.id };
            }

            pushHistory();
            return { layers, activeLayerId };
          });
        },

        setActiveLayer: (id) => set({ activeLayerId: id }),

        setLayerPixels: (
          layerId: string,
          pixels: { x: number; y: number; color: number }[]
        ) =>
          set((state) => {
            const layer = state.layers.find((l) => l.id === layerId);
            if (!layer) return state;
            const newPixels = new Map(layer.pixels);
            pixels.forEach(({ x, y, color }) => {
              const key = `${x},${y}`;
              if (color === 0) newPixels.delete(key);
              else newPixels.set(key, color);
            });
            return {
              layers: state.layers.map((l) =>
                l.id === layerId ? { ...l, pixels: newPixels } : l
              ),
            };
          }),

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
