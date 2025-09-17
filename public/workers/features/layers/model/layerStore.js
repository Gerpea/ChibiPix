import { useHistoryStore } from '@/features/history/model/historyStore';
import { exportLayers, importLayers } from '@/features/serialization/utils';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
export const useLayerStore = create()(devtools((set, get) => {
    const defaultLayer = {
        id: Date.now().toString(),
        name: 'Layer 1',
        visible: true,
        pixels: new Map(),
    };
    const pushHistory = () => {
        useHistoryStore.getState().push();
    };
    return {
        layers: [defaultLayer],
        activeLayerId: defaultLayer.id,
        addLayer: (name = 'Layer') => {
            const newLayer = {
                id: Date.now().toString(),
                name: `${name} ${get().layers.length + 1}`,
                visible: true,
                pixels: new Map(),
            };
            set((state) => {
                const layers = [...state.layers, newLayer];
                pushHistory();
                return { layers, activeLayerId: newLayer.id };
            });
        },
        removeLayer: (id) => {
            set((state) => {
                var _a, _b;
                const layers = state.layers.filter((l) => l.id !== id);
                const activeLayerId = state.activeLayerId === id
                    ? ((_b = (_a = layers[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null)
                    : state.activeLayerId;
                if (layers.length === 0) {
                    const defaultLayer = {
                        id: Date.now().toString(),
                        name: 'Layer 1',
                        visible: true,
                        pixels: new Map(),
                    };
                    pushHistory();
                    return { layers: [defaultLayer], activeLayerId: defaultLayer.id };
                }
                pushHistory();
                return { layers, activeLayerId };
            });
        },
        setActiveLayer: (id) => set({ activeLayerId: id }),
        setLayerPixels: (layerId, pixels) => set((state) => {
            const layer = state.layers.find((l) => l.id === layerId);
            if (!layer)
                return state;
            const newPixels = new Map(layer.pixels);
            pixels.forEach(({ x, y, color }) => {
                const key = `${x},${y}`;
                if (color === 0)
                    newPixels.delete(key);
                else
                    newPixels.set(key, color);
            });
            pushHistory();
            return {
                layers: state.layers.map((l) => l.id === layerId ? Object.assign(Object.assign({}, l), { pixels: newPixels }) : l),
            };
        }),
        toggleVisibility: (id) => {
            set((state) => {
                const layers = state.layers.map((l) => l.id === id ? Object.assign(Object.assign({}, l), { visible: !l.visible }) : l);
                pushHistory();
                return { layers };
            });
        },
        moveLayer: (fromIndex, toIndex) => {
            set((state) => {
                if (fromIndex < 0 ||
                    fromIndex >= state.layers.length ||
                    toIndex < 0 ||
                    toIndex >= state.layers.length)
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
                const layers = state.layers.map((l) => l.id === id ? Object.assign(Object.assign({}, l), { name }) : l);
                pushHistory();
                return { layers };
            });
        },
        exportData: async (onProgress) => {
            try {
                const data = await exportLayers(get().layers, onProgress);
                console.log('Exported .layr data:', data);
                return data;
            }
            catch (error) {
                console.error('Export failed:', error.message);
                throw error;
            }
        },
        importData: async (data, onProgress) => {
            try {
                const layers = await importLayers(data, onProgress);
                set((state) => {
                    const activeLayerId = layers.length > 0 ? layers[0].id : state.activeLayerId;
                    console.log('Imported layers:', layers);
                    pushHistory();
                    return { layers, activeLayerId };
                });
            }
            catch (error) {
                console.error('Import failed:', error.message);
                throw error;
            }
        },
    };
}, { name: 'LayerStore' }));
