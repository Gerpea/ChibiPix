import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useLayerStore } from '@/features/layers/model/layerStore';
export const useHistoryStore = create()(devtools((set, get) => ({
    past: [],
    future: [],
    push: () => {
        const layers = useLayerStore.getState().layers.map((l) => ({
            id: l.id,
            pixels: new Map(l.pixels), // Deep copy of Map
            visible: l.visible,
            name: l.name,
        }));
        set({ past: [...get().past, layers], future: [] });
    },
    undo: () => {
        var _a, _b;
        const { past, future } = get();
        if (past.length === 0)
            return;
        const currentLayers = useLayerStore.getState().layers.map((l) => ({
            id: l.id,
            pixels: new Map(l.pixels), // Deep copy of Map
            visible: l.visible,
            name: l.name,
        }));
        const previous = past[past.length - 1];
        // Restore full layers array
        useLayerStore.setState({
            layers: previous.map((l) => ({
                id: l.id,
                pixels: new Map(l.pixels), // Deep copy of Map
                visible: l.visible,
                name: l.name,
            })),
            activeLayerId: (_b = (_a = previous[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        });
        set({ past: past.slice(0, -1), future: [currentLayers, ...future] });
    },
    redo: () => {
        var _a, _b;
        const { past, future } = get();
        if (future.length === 0)
            return;
        const currentLayers = useLayerStore.getState().layers.map((l) => ({
            id: l.id,
            pixels: new Map(l.pixels), // Deep copy of Map
            visible: l.visible,
            name: l.name,
        }));
        const next = future[0];
        // Restore full layers array
        useLayerStore.setState({
            layers: next.map((l) => ({
                id: l.id,
                pixels: new Map(l.pixels),
                visible: l.visible,
                name: l.name,
            })),
            activeLayerId: (_b = (_a = next[0]) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : null,
        });
        set({ past: [...past, currentLayers], future: future.slice(1) });
    },
    clear: () => set({ past: [], future: [] }),
}), { name: 'HistoryStore' }));
