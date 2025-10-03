import { create } from 'zustand';
import { devtools, persist, PersistStorage } from 'zustand/middleware';
import { useHistoryStore } from '@/features/history/model/historyStore';
import {
  exportAnimation,
  ExportProgress,
  importAnimation,
  ImportProgress,
} from '@/features/serialization/utils';
import { useAIStore } from '@/features/ai-generation/model/aiStore';
import { isPixelInActiveAIArea } from '@/features/ai-generation/lib/utils';

// Existing interfaces remain unchanged
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  pixels: Map<string, number>;
}

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  duration: number;
}

export interface Pixel {
  x: number;
  y: number;
  color: number;
}

interface AnimationState {
  frames: Frame[];
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  isImporting: boolean;
  timer: number | null;
  currentTime: number;

  addFrame: (duplicateCurrent?: boolean) => void;
  removeFrame: (index: number) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  setCurrentFrame: (index: number) => void;
  setFps: (fps: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (time: number) => void;

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

  exportAnimationData: (
    onProgress: (progress: ExportProgress) => void
  ) => Promise<string>;
  importAnimationData: (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => Promise<void>;
}

function deepCloneLayers(layers: Layer[]): {
  layers: Layer[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();
  const clonedLayers = layers.map((layer) => {
    const newId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);
    idMap.set(layer.id, newId);
    return { ...layer, id: newId, pixels: new Map(layer.pixels) };
  });
  return { layers: clonedLayers, idMap };
}

const dbName = 'zustandDB';
const storeName = 'states';

const openDB = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = (event) =>
      resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) =>
      reject((event.target as IDBOpenDBRequest).error);
  });

interface PersistedState {
  frames: Frame[];
  fps: number;
}

const indexedDBStorage: PersistStorage<PersistedState> = {
  getItem: async (key: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) {
          try {
            const parsed = JSON.parse(request.result);
            const state = fromSerializable(parsed.state);
            resolve({ state, version: parsed.version });
          } catch (e) {
            reject(e);
          }
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  },
  setItem: async (
    key: string,
    value: { state: PersistedState; version: number }
  ) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.put(
        JSON.stringify({
          state: toSerializable(value.state),
          version: value.version,
        }),
        key
      );
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  },
  removeItem: async (key: string) => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(null);
      request.onerror = () => reject(request.error);
    });
  },
};

function toSerializable(state: PersistedState) {
  return {
    ...state,
    frames: state.frames.map((frame) => ({
      ...frame,
      layers: frame.layers.map((layer) => ({
        ...layer,
        pixels: Array.from(layer.pixels.entries()),
      })),
    })),
  };
}

function fromSerializable(serial: PersistedState): PersistedState {
  return {
    ...serial,
    frames: serial.frames.map((frame: Frame) => ({
      ...frame,
      layers: frame.layers.map((layer: Layer) => ({
        ...layer,
        pixels: new Map(layer.pixels),
      })),
    })),
  };
}

export const useAnimationStore = create<AnimationState>()(
  devtools(
    persist(
      (set, get) => {
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
          fps: 12,
          isPlaying: false,
          isImporting: false,
          timer: null,
          currentTime: 0,

          addFrame: (duplicateCurrent = false) => {
            set((state) => {
              const currentFrame = state.frames[state.currentFrameIndex];
              let newLayers: Layer[] = [];
              let newActiveLayerId = '';

              if (duplicateCurrent) {
                const { layers: clonedLayers, idMap } = deepCloneLayers(
                  currentFrame.layers
                );
                newLayers = clonedLayers;
                newActiveLayerId =
                  idMap.get(currentFrame.activeLayerId) ||
                  clonedLayers[0]?.id ||
                  '';
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

          removeFrame: (index) => {
            if (get().frames.length <= 1) return;
            set((state) => {
              const frames = state.frames.filter((_, i) => i !== index);
              let newIndex = state.currentFrameIndex;
              if (newIndex >= frames.length) {
                newIndex = frames.length - 1;
              }
              useHistoryStore.getState().push();
              return { frames, currentFrameIndex: newIndex };
            });
          },

          moveFrame: (fromIndex, toIndex) => {
            set((state) => {
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
              } else if (
                fromIndex < newCurrentIndex &&
                toIndex >= newCurrentIndex
              ) {
                newCurrentIndex--;
              } else if (
                fromIndex > newCurrentIndex &&
                toIndex <= newCurrentIndex
              ) {
                newCurrentIndex++;
              }

              useHistoryStore.getState().push();
              return { frames, currentFrameIndex: newCurrentIndex };
            });
          },

          setCurrentFrame: (index) => {
            set((state) => {
              if (index < 0 || index >= state.frames.length) return state;
              return { currentFrameIndex: index };
            });
          },

          setFps: (fps) => {
            if (fps < 1) return;
            set({ fps });
            if (get().isPlaying) {
              get().pause();
              get().play();
            }
          },

          setFrameDuration: (index, duration) => {
            if (duration < 1) return;
            set((state) => {
              const frames = [...state.frames];
              if (frames[index]) {
                frames[index].duration = duration;
                useHistoryStore.getState().push();
                return { frames };
              }
              return state;
            });
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
                (acc, f) => acc + f.duration,
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
            set((state) => {
              if (!state.isPlaying || !state.timer) return state;
              cancelAnimationFrame(state.timer);
              return { isPlaying: false, timer: null };
            });
          },

          stop: () => {
            set((state) => {
              if (state.timer) cancelAnimationFrame(state.timer);
              return {
                isPlaying: false,
                timer: null,
                currentFrameIndex: 0,
                currentTime: 0,
              };
            });
          },

          setCurrentTime: (time) => {
            set((state) => {
              if (state.frames.length === 0) return state;
              const totalDuration = state.frames.reduce(
                (acc, f) => acc + f.duration,
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

          addLayer: (name = 'Layer') => {
            set((state) => {
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

          removeLayer: (id) => {
            set((state) => {
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

          duplicateLayer: (layerId) => {
            set((state) => {
              const currentFrame = state.frames[state.currentFrameIndex];
              const sourceLayer = currentFrame.layers.find(
                (l) => l.id === layerId
              );

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

          setActiveLayer: (id) => {
            set((state) => {
              const currentFrame = state.frames[state.currentFrameIndex];
              const newFrames = [...state.frames];
              newFrames[state.currentFrameIndex] = {
                ...currentFrame,
                activeLayerId: id,
              };
              return { frames: newFrames };
            });
          },

          setLayerPixels: (layerId, pixels, force = false) => {
            set((state) => {
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

          toggleLayerVisibility: (id) => {
            set((state) => {
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

          toggleLayerLock: (id) => {
            set((state) => {
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

          setLayerLock: (id, locked) => {
            set((state) => {
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

          moveLayer: (fromIndex, toIndex) => {
            set((state) => {
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

          setLayerName: (id, name) => {
            set((state) => {
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

          exportAnimationData: async (onProgress) => {
            const { frames, fps } = get();
            return await exportAnimation({ frames, fps }, onProgress);
          },

          importAnimationData: async (data, onProgress) => {
            const { frames, fps } = await importAnimation(data, onProgress);
            if (!frames || frames.length === 0) {
              throw new Error('Import failed: No frames found in the file.');
            }

            set({
              frames,
              fps,
              currentFrameIndex: 0,
              currentTime: 0,
              isPlaying: false,
              isImporting: true,
              timer: null,
            });
            useHistoryStore.getState().push();
          },
        };
      },
      {
        name: 'animation-store',
        storage: indexedDBStorage,
        partialize: (state: AnimationState) => ({
          frames: state.frames,
          fps: state.fps,
        }),
      }
    ),
    { name: 'AnimationStore' }
  )
);
