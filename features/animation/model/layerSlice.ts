import { isPixelInActiveAIArea } from '@/features/ai-generation/lib/utils';
import { useAIStore } from '@/features/ai-generation/model/aiStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { AnimationState, Layer, PersistedState, Pixel } from './types';
import { StateCreator } from 'zustand';

interface LayerSlice {
  addLayer: (name?: string) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (layerId: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerPixels: (layerId: string, pixels: Pixel[], force?: boolean) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  setLayerLock: (id: string, locked: boolean) => void;
  moveLayer: (fromIndex: number, toIndex: number) => void;
  setLayerName: (id: string, name: string) => void;
}

export const createLayerSlice: StateCreator<
  AnimationState,
  [['zustand/devtools', never], ['zustand/persist', PersistedState]],
  [],
  LayerSlice
> = (set, get) => ({
  addLayer: (name = 'Layer') => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newLayer: Layer = {
        id: Date.now().toString(),
        name: `${name} ${currentFrame.layers.length + 1}`,
        visible: true,
        locked: false,
        pixels: new Map(),
      };

      const newLayers = [...currentFrame.layers, newLayer];
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
        activeLayerId: newLayer.id,
      };

      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  removeLayer: (id: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      if (currentFrame.layers.length <= 1) return state;

      const newLayers = currentFrame.layers.filter((l) => l.id !== id);
      const newActiveLayerId =
        id === currentFrame.activeLayerId
          ? (newLayers[newLayers.length - 1]?.id ?? '')
          : currentFrame.activeLayerId;

      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
        activeLayerId: newActiveLayerId,
      };

      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  duplicateLayer: (layerId: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const sourceLayer = currentFrame.layers.find((l) => l.id === layerId);

      if (!sourceLayer) return state;

      const newLayer: Layer = {
        id: Date.now().toString(),
        name: `${sourceLayer.name} copy`,
        visible: true,
        locked: false,
        pixels: new Map(sourceLayer.pixels),
      };

      const sourceIndex = currentFrame.layers.findIndex(
        (l) => l.id === layerId
      );

      const newLayers = [...currentFrame.layers];
      newLayers.splice(sourceIndex + 1, 0, newLayer);

      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
        activeLayerId: newLayer.id,
      };

      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  setActiveLayer: (id: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        activeLayerId: id,
      };
      return { frames: newFrames };
    });
  },

  setLayerPixels: (layerId: string, pixels: Pixel[], force = false) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const layer = currentFrame.layers.find((l) => l.id === layerId);
      if ((!layer || layer.locked) && !force) return state;

      const filteredPixels = force
        ? pixels
        : pixels.filter(
            (p) =>
              !isPixelInActiveAIArea(
                p,
                useAIStore.getState().generations,
                layer?.id
              )
          );
      if (filteredPixels.length === 0) return state;

      const newPixels = new Map(layer!.pixels);
      filteredPixels.forEach(({ x, y, color }) => {
        const key = `${x},${y}`;
        if (color === 0) newPixels.delete(key);
        else newPixels.set(key, color);
      });

      const newLayers = currentFrame.layers.map((l) =>
        l.id === layerId ? { ...l, pixels: newPixels } : l
      );
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };

      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  toggleLayerVisibility: (id: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newLayers = currentFrame.layers.map((l) =>
        l.id === id ? { ...l, visible: !l.visible } : l
      );
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };
      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  toggleLayerLock: (id: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newLayers = currentFrame.layers.map((l) =>
        l.id === id ? { ...l, locked: !l.locked } : l
      );
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };
      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  setLayerLock: (id: string, locked: boolean) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newLayers = currentFrame.layers.map((l) =>
        l.id === id ? { ...l, locked } : l
      );
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };
      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  moveLayer: (fromIndex: number, toIndex: number) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      if (
        fromIndex < 0 ||
        fromIndex >= currentFrame.layers.length ||
        toIndex < 0 ||
        toIndex >= currentFrame.layers.length
      )
        return state;

      const newLayers = [...currentFrame.layers];
      const [moved] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, moved);

      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };

      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },

  setLayerName: (id: string, name: string) => {
    set((state: AnimationState) => {
      const currentFrame = state.frames[state.currentFrameIndex];
      const newLayers = currentFrame.layers.map((l) =>
        l.id === id ? { ...l, name } : l
      );
      const newFrames = [...state.frames];
      newFrames[state.currentFrameIndex] = {
        ...currentFrame,
        layers: newLayers,
      };
      useHistoryStore.getState().push();
      return { frames: newFrames };
    });
  },
});
