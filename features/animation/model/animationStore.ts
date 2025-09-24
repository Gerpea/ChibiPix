// features/animation/model/animationStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore, type Layer } from '@/features/layers/model/layerStore';
import {
  exportAnimation,
  ExportProgress,
  importAnimation,
  ImportProgress,
} from '@/features/serialization/utils';

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  duration: number;
}

interface AnimationState {
  frames: Frame[];
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  timer: number | null;
  currentTime: number;
  addFrame: (duplicateCurrent?: boolean) => void;
  removeFrame: (index: number) => void;
  moveFrame: (fromIndex: number, toIndex: number) => void;
  setCurrentFrame: (index: number) => void;
  setFps: (fps: number) => void;
  setFrameDuration: (index: number, duration: number) => void;
  setCurrentTime: (time: number) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  updateCurrentFrameLayers: (layers: Layer[], activeLayerId: string) => void;
  // New functions for import/export
  exportAnimationData: (
    onProgress: (progress: ExportProgress) => void
  ) => Promise<string>;
  importAnimationData: (
    data: string,
    onProgress: (progress: ImportProgress) => void
  ) => Promise<void>;
}

// ... deepCloneLayers and cloneLayersPreserveIds functions remain unchanged ...
function deepCloneLayers(layers: Layer[]): {
  layers: Layer[];
  idMap: Map<string, string>;
} {
  const idMap = new Map<string, string>();
  const clonedLayers = layers.map((layer) => {
    const newId =
      Date.now().toString() + Math.random().toString(36).substr(2, 9);
    idMap.set(layer.id, newId);
    return {
      ...layer,
      id: newId,
      pixels: new Map(layer.pixels),
    };
  });
  return { layers: clonedLayers, idMap };
}

function cloneLayersPreserveIds(layers: Layer[]): Layer[] {
  return layers.map((layer) => ({
    ...layer,
    id: layer.id,
    pixels: new Map(layer.pixels),
  }));
}

export const useAnimationStore = create<AnimationState>()(
  devtools(
    (set, get) => {
      // ... initialFrame, defaultLayer, and applyFrameToLayerStore setup remain unchanged ...
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
        duration: 100,
      };

      function applyFrameToLayerStore(frame: Frame): string {
        const { layers: clonedLayers, idMap } = deepCloneLayers(frame.layers);
        const newActiveLayerId =
          idMap.get(frame.activeLayerId) ||
          clonedLayers[0]?.id ||
          frame.activeLayerId;

        useLayerStore.setState({
          layers: clonedLayers,
          activeLayerId: newActiveLayerId,
        });

        const ls = useLayerStore.getState();
        if (
          ls.setActiveLayer &&
          !ls.layers.find((l) => l.id === ls.activeLayerId) &&
          ls.layers.length > 0
        ) {
          ls.setActiveLayer(ls.layers[0].id);
        }

        return newActiveLayerId;
      }

      return {
        frames: [initialFrame],
        currentFrameIndex: 0,
        fps: 12,
        isPlaying: false,
        timer: null,
        currentTime: 0,

        // ... All other animation functions (addFrame, removeFrame, etc.) remain unchanged ...
        addFrame: (duplicateCurrent = false) => {
          const currentLayers = useLayerStore.getState().layers;
          const currentActiveLayerId = useLayerStore.getState().activeLayerId;
          const { layers: newLayers, idMap } = duplicateCurrent
            ? deepCloneLayers(currentLayers)
            : { layers: [], idMap: new Map() };
          const newActiveLayerId = duplicateCurrent
            ? idMap.get(currentActiveLayerId) || currentActiveLayerId
            : Date.now().toString();

          if (!duplicateCurrent) {
            newLayers.push({
              id: newActiveLayerId,
              name: 'Layer 1',
              visible: true,
              locked: false,
              pixels: new Map(),
            });
          }

          const newFrame: Frame = {
            id: Date.now().toString(),
            name: `Frame ${get().frames.length + 1}`,
            layers: newLayers,
            activeLayerId: newActiveLayerId,
            duration: get().frames[get().currentFrameIndex]?.duration ?? 100,
          };

          set((state) => {
            const frames = [...state.frames, newFrame];
            const newIndex = frames.length - 1;
            useHistoryStore.getState().push();
            applyFrameToLayerStore(newFrame);
            return { frames, currentFrameIndex: newIndex, currentTime: 0 };
          });
        },

        removeFrame: (index) => {
          if (get().frames.length <= 1) return;
          set((state) => {
            const frames = state.frames.filter((_, i) => i !== index);
            let newIndex = state.currentFrameIndex;
            if (newIndex >= frames.length) newIndex = frames.length - 1;
            if (newIndex >= 0) {
              const liveLayers = useLayerStore.getState().layers;
              const liveActive = useLayerStore.getState().activeLayerId;
              const preserved = cloneLayersPreserveIds(liveLayers);
              const framesCopy = [...frames];
              if (state.currentFrameIndex < framesCopy.length) {
                framesCopy[state.currentFrameIndex] = {
                  ...framesCopy[state.currentFrameIndex],
                  layers: preserved,
                  activeLayerId: liveActive,
                };
              }
              applyFrameToLayerStore(framesCopy[newIndex]);
              useHistoryStore.getState().push();
              return {
                frames: framesCopy,
                currentFrameIndex: newIndex,
                currentTime: 0,
              };
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
            let currentFrameIndex = state.currentFrameIndex;
            if (fromIndex === currentFrameIndex) {
              currentFrameIndex = toIndex;
            } else if (
              fromIndex < currentFrameIndex &&
              toIndex >= currentFrameIndex
            ) {
              currentFrameIndex--;
            } else if (
              fromIndex > currentFrameIndex &&
              toIndex <= currentFrameIndex
            ) {
              currentFrameIndex++;
            }
            useHistoryStore.getState().push();
            applyFrameToLayerStore(frames[currentFrameIndex]);
            return { frames, currentFrameIndex, currentTime: 0 };
          });
        },

        setCurrentFrame: (index) => {
          set((state) => {
            if (index < 0 || index >= state.frames.length) return state;

            const liveLayers = useLayerStore.getState().layers;
            const liveActive = useLayerStore.getState().activeLayerId;
            const preservedLayers = cloneLayersPreserveIds(liveLayers);

            const framesCopy = [...state.frames];
            if (
              state.currentFrameIndex >= 0 &&
              state.currentFrameIndex < framesCopy.length
            ) {
              framesCopy[state.currentFrameIndex] = {
                ...framesCopy[state.currentFrameIndex],
                layers: preservedLayers,
                activeLayerId: liveActive,
              };
            }

            const targetFrame = framesCopy[index];
            applyFrameToLayerStore(targetFrame);

            return {
              frames: framesCopy,
              currentFrameIndex: index,
              currentTime: 0,
            };
          });
        },

        setFps: (fps) => {
          set((state) => {
            if (fps < 1) return state;
            if (state.isPlaying && state.timer) {
              if (state.timer) cancelAnimationFrame(state.timer);
              const newState = { fps };
              set(() => newState);
              requestAnimationFrame(() => {
                get().play();
              });
              return { fps };
            }
            return { fps };
          });
        },

        setFrameDuration: (index, duration) => {
          if (duration < 1) return;
          set((state) => {
            const frames = [...state.frames];
            frames[index].duration = duration;
            useHistoryStore.getState().push();
            return { frames };
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

            if (currentFrameIndex !== state.currentFrameIndex) {
              const liveLayers = useLayerStore.getState().layers;
              const liveActive = useLayerStore.getState().activeLayerId;
              const preserved = cloneLayersPreserveIds(liveLayers);
              const framesCopy = [...state.frames];
              if (
                state.currentFrameIndex >= 0 &&
                state.currentFrameIndex < framesCopy.length
              ) {
                framesCopy[state.currentFrameIndex] = {
                  ...framesCopy[state.currentFrameIndex],
                  layers: preserved,
                  activeLayerId: liveActive,
                };
              }
              applyFrameToLayerStore(framesCopy[currentFrameIndex]);
              return {
                currentTime: bounded,
                currentFrameIndex,
                frames: framesCopy,
              };
            }

            return { currentTime: bounded };
          });
        },

        play: () => {
          if (get().frames.length === 0) return;
          set((state) => {
            if (state.isPlaying) return state;
            let lastTime: number | null = null;

            const animate = (currentTimestamp: number) => {
              set((innerState) => {
                if (!innerState.isPlaying) return innerState;
                if (!lastTime) lastTime = currentTimestamp;
                const deltaTime = currentTimestamp - lastTime;
                lastTime = currentTimestamp;

                let currentTime = innerState.currentTime + deltaTime;
                let currentFrameIndex = innerState.currentFrameIndex;
                let accumulated = 0;
                const totalDuration = innerState.frames.reduce(
                  (acc, f) => acc + f.duration,
                  0
                );

                if (totalDuration === 0) {
                  return { isPlaying: false, timer: null };
                }

                if (currentTime >= totalDuration) {
                  currentTime = currentTime % totalDuration;
                  currentFrameIndex = 0;
                  accumulated = 0;
                }

                for (let i = 0; i < innerState.frames.length; i++) {
                  accumulated += innerState.frames[i].duration;
                  if (currentTime <= accumulated) {
                    currentFrameIndex = i;
                    break;
                  }
                }

                if (currentFrameIndex !== innerState.currentFrameIndex) {
                  const targetFrame = innerState.frames[currentFrameIndex];
                  applyFrameToLayerStore(targetFrame);
                }

                const timer = requestAnimationFrame(animate);
                return { currentFrameIndex, currentTime, timer };
              });
            };

            const timer = requestAnimationFrame(animate);
            return { isPlaying: true, timer };
          });
        },

        pause: () => {
          set((state) => {
            if (!state.isPlaying) return state;
            if (state.timer) cancelAnimationFrame(state.timer);
            return { isPlaying: false, timer: null };
          });
        },

        stop: () => {
          set((state) => {
            if (state.timer) cancelAnimationFrame(state.timer);
            if (state.frames.length > 0) {
              const liveLayers = useLayerStore.getState().layers;
              const liveActive = useLayerStore.getState().activeLayerId;
              const preserved = cloneLayersPreserveIds(liveLayers);
              const framesCopy = [...state.frames];
              if (
                state.currentFrameIndex >= 0 &&
                state.currentFrameIndex < framesCopy.length
              ) {
                framesCopy[state.currentFrameIndex] = {
                  ...framesCopy[state.currentFrameIndex],
                  layers: preserved,
                  activeLayerId: liveActive,
                };
              }
              applyFrameToLayerStore(framesCopy[0]);
              return {
                isPlaying: false,
                timer: null,
                currentFrameIndex: 0,
                currentTime: 0,
                frames: framesCopy,
              };
            }
            return {
              isPlaying: false,
              timer: null,
              currentFrameIndex: 0,
              currentTime: 0,
            };
          });
        },

        updateCurrentFrameLayers: (layers, activeLayerId) => {
          set((state) => {
            if (
              state.currentFrameIndex < 0 ||
              state.currentFrameIndex >= state.frames.length
            )
              return state;

            const preserved = cloneLayersPreserveIds(layers);
            const newActive = activeLayerId;
            const newFrames = [...state.frames];
            newFrames[state.currentFrameIndex] = {
              ...newFrames[state.currentFrameIndex],
              layers: preserved,
              activeLayerId: newActive,
            };
            useHistoryStore.getState().push();
            return { frames: newFrames };
          });
        },

        exportAnimationData: async (onProgress) => {
          try {
            // Persist any current canvas changes before exporting
            get().setCurrentFrame(get().currentFrameIndex);
            const { frames, fps } = get();
            const data = await exportAnimation({ frames, fps }, onProgress);
            console.log('Exported .anim data successfully.');
            return data;
          } catch (error) {
            console.error('Export failed:', (error as Error).message);
            throw error;
          }
        },

        importAnimationData: async (data, onProgress) => {
          try {
            const { frames, fps } = await importAnimation(data, onProgress);
            if (!frames || frames.length === 0) {
              throw new Error('Import failed: No frames found in the file.');
            }

            set(() => {
              const firstFrame = frames[0];
              // The layers from the imported file become the new "live" layers
              // They must be cloned to ensure the layer store has its own copy
              const liveLayers = cloneLayersPreserveIds(firstFrame.layers);

              useLayerStore.setState({
                layers: liveLayers,
                activeLayerId: firstFrame.activeLayerId,
              });

              console.log('Imported animation successfully.');
              useHistoryStore.getState().push();
              return {
                frames,
                fps,
                currentFrameIndex: 0,
                currentTime: 0,
                isPlaying: false,
                timer: null,
              };
            });
          } catch (error) {
            console.error('Import failed:', (error as Error).message);
            throw error;
          }
        },
      };
    },
    { name: 'AnimationStore' }
  )
);
