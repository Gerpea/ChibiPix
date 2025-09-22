import { useHistoryStore } from '@/features/history/model/historyStore';
import {
  exportLayers,
  ExportProgress,
  importLayers,
  ImportProgress,
} from '@/features/serialization/utils';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAnimationStore } from '@/features/animation/model/animationStore';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  pixels: Map<string, number>;
}

interface LayerStoreState {
  layers: Layer[];
  activeLayerId: string;
  aiAreas: Record<string, { startX: number; startY: number }>;
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerPixels: (
    id: string,
    pixels: { x: number; y: number; color: number }[],
    force?: boolean
  ) => void;
  toggleVisibility: (id: string) => void;
  toggleLock: (id: string) => void;
  setLayerLock: (id: string, locked: boolean) => void;
  addAIArea: (id: string, area: { startX: number; startY: number }) => void;
  removeAIArea: (id: string) => void;
  setLayers: (layers: Layer[], activeLayerId?: string) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerName: (id: string, name: string) => void;
  exportData: (
    onProgress: (progress: ExportProgress) => void
  ) => Promise<string>;
  importData: (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => Promise<void>;
}

export const useLayerStore = create<LayerStoreState>()(
  devtools(
    (set, get) => {
      const defaultLayer: Layer = {
        id: Date.now().toString(),
        name: 'Layer 1',
        visible: true,
        locked: false,
        pixels: new Map(),
      };

      const pushHistory = () => {
        useHistoryStore.getState().push();
      };

      return {
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,
        aiAreas: {},

        addLayer: (name = 'Layer') => {
          const newLayer: Layer = {
            id: Date.now().toString(),
            name: `${name} ${get().layers.length + 1}`,
            visible: true,
            locked: false,
            pixels: new Map(),
          };
          set((state) => {
            const layers = [...state.layers, newLayer];
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, newLayer.id);
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
                locked: false,
                pixels: new Map(),
              };
              pushHistory();
              useAnimationStore
                .getState()
                .updateCurrentFrameLayers([defaultLayer], defaultLayer.id);
              return { layers: [defaultLayer], activeLayerId: defaultLayer.id };
            }

            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, activeLayerId);
            return { layers, activeLayerId };
          });
        },

        setActiveLayer: (id) => set({ activeLayerId: id }),

        setLayerPixels: (
          layerId: string,
          pixels: { x: number; y: number; color: number }[],
          force = false
        ) =>
          set((state) => {
            const layer = state.layers.find((l) => l.id === layerId);
            if ((!layer || layer.locked) && !force) return state;

            let filteredPixels = pixels;
            if (!force) {
              const aiAreas = state.aiAreas;
              filteredPixels = pixels.filter(
                (p) =>
                  !Object.values(aiAreas).some(
                    (area) =>
                      p.x >= area.startX &&
                      p.x < area.startX + 16 &&
                      p.y >= area.startY &&
                      p.y < area.startY + 16
                  )
              );
            }

            if (filteredPixels.length === 0) return state;

            const newPixels = new Map(layer!.pixels);
            filteredPixels.forEach(({ x, y, color }) => {
              const key = `${x},${y}`;
              if (color === 0) newPixels.delete(key);
              else newPixels.set(key, color);
            });
            const newLayers = state.layers.map((l) =>
              l.id === layerId ? { ...l, pixels: newPixels } : l
            );
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(newLayers, state.activeLayerId);
            return { layers: newLayers };
          }),

        toggleVisibility: (id) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, visible: !l.visible } : l
            );
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, state.activeLayerId);
            return { layers };
          });
        },

        toggleLock: (id) => {
          set((state) => {
            const layer = state.layers.find((l) => l.id === id);
            if (!layer) return state;
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, locked: !l.locked } : l
            );
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, state.activeLayerId);
            return { layers };
          });
        },

        setLayerLock: (id, locked) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, locked } : l
            );
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, state.activeLayerId);
            return { layers };
          });
        },

        addAIArea: (id, area) => {
          set({ aiAreas: { ...get().aiAreas, [id]: area } });
        },

        removeAIArea: (id) => {
          const aiAreas = { ...get().aiAreas };
          delete aiAreas[id];
          set({ aiAreas });
        },

        setLayers: (layers, activeLayerId) => {
          set((state) => {
            const newActiveLayerId =
              activeLayerId || layers[0]?.id || state.activeLayerId;
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, newActiveLayerId);
            return { layers, activeLayerId: newActiveLayerId };
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
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(newLayers, state.activeLayerId);
            return { layers: newLayers };
          });
        },

        setLayerName: (id, name) => {
          set((state) => {
            const layers = state.layers.map((l) =>
              l.id === id ? { ...l, name } : l
            );
            pushHistory();
            useAnimationStore
              .getState()
              .updateCurrentFrameLayers(layers, state.activeLayerId);
            return { layers };
          });
        },

        exportData: async (onProgress) => {
          try {
            const data = await exportLayers(get().layers, onProgress);
            console.log('Exported .layr data:', data);
            return data;
          } catch (error) {
            console.error('Export failed:', (error as Error).message);
            throw error;
          }
        },

        importData: async (data, onProgress) => {
          try {
            const layers = await importLayers(data, onProgress);
            set((state) => {
              const activeLayerId =
                layers.length > 0 ? layers[0].id : state.activeLayerId;
              console.log('Imported layers:', layers);
              pushHistory();
              useAnimationStore
                .getState()
                .updateCurrentFrameLayers(layers, activeLayerId);
              return { layers, activeLayerId };
            });
          } catch (error) {
            console.error('Import failed:', (error as Error).message);
            throw error;
          }
        },
      };
    },
    { name: 'LayerStore' }
  )
);
