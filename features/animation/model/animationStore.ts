import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore, type Layer } from '@/features/layers/model/layerStore';

export interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  activeLayerId: string;
  duration: number; // duration units: milliseconds in this implementation
}

interface AnimationState {
  frames: Frame[];
  currentFrameIndex: number;
  fps: number;
  isPlaying: boolean;
  timer: number | null; // requestAnimationFrame id
  currentTime: number; // ms from loop start
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
}

/**
 * Deep clone layers **and** generate *new* IDs (used when applying a frame to the live layer store
 * so the live layer objects are independent of stored frame objects).
 */
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
      // clone pixels Map
      pixels: new Map(layer.pixels),
    };
  });
  return { layers: clonedLayers, idMap };
}

/**
 * Clone layers but *preserve* their ids. Useful when saving current live layer-store into a frame
 * so activeLayerId keeps pointing to the correct id.
 */
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
        duration: 100, // milliseconds per frame by default
      };

      /**
       * Apply a stored frame into the live layer store.
       * This uses deepCloneLayers so the live layer objects are independent of the frame data.
       * Returns the new activeLayerId applied.
       */
      function applyFrameToLayerStore(frame: Frame): string {
        const { layers: clonedLayers, idMap } = deepCloneLayers(frame.layers);
        const newActiveLayerId =
          idMap.get(frame.activeLayerId) ||
          clonedLayers[0]?.id ||
          frame.activeLayerId;

        // set layers and active layer directly
        useLayerStore.setState({
          layers: clonedLayers,
          activeLayerId: newActiveLayerId,
        });

        // if layer store provides setter helpers for active layer, ensure it's consistent:
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
            // set current frame AFTER pushing to history
            useHistoryStore.getState().push();
            // apply the new frame to the layer store so UI reflects it
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
              // before switching, save current live layers into the current frame
              const liveLayers = useLayerStore.getState().layers;
              const liveActive = useLayerStore.getState().activeLayerId;
              const preserved = cloneLayersPreserveIds(liveLayers);
              const framesCopy = [...frames];
              // ensure we don't write out-of-bounds
              if (state.currentFrameIndex < framesCopy.length) {
                framesCopy[state.currentFrameIndex] = {
                  ...framesCopy[state.currentFrameIndex],
                  layers: preserved,
                  activeLayerId: liveActive,
                };
              }
              // apply the target frame to layer store
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
            // ensure layer store displays currentFrameIndex frame after move:
            applyFrameToLayerStore(frames[currentFrameIndex]);
            return { frames, currentFrameIndex, currentTime: 0 };
          });
        },

        /**
         * Save current live layers into the current frame, then load the target frame into layerStore.
         */
        setCurrentFrame: (index) => {
          set((state) => {
            if (index < 0 || index >= state.frames.length) return state;

            // 1) Save live layers into the currently selected frame to avoid losing drawing edits
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

            // 2) Apply target frame to layer store (with id remapping so live store is independent)
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
              // restart play loop with the new FPS setting by stopping and starting
              if (state.timer) cancelAnimationFrame(state.timer);
              // small synchronous update to set fps; restarting play below
              const newState = { fps };
              // after state update, restart play
              set(() => newState);
              // Call play outside of set's returned object to avoid nested set calls.
              // (We can trigger it synchronously since set above already applied)
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

            // apply the frame if it changed
            if (currentFrameIndex !== state.currentFrameIndex) {
              // Save current live layers then apply new frame:
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
                  // nothing to play
                  return { isPlaying: false, timer: null };
                }

                // loop
                if (currentTime >= totalDuration) {
                  currentTime = currentTime % totalDuration;
                  currentFrameIndex = 0;
                  accumulated = 0;
                }

                // determine frame index for currentTime
                for (let i = 0; i < innerState.frames.length; i++) {
                  accumulated += innerState.frames[i].duration;
                  if (currentTime <= accumulated) {
                    currentFrameIndex = i;
                    break;
                  }
                }

                // If frame changed, apply the frame to the layer store directly (avoid calling setCurrentFrame)
                if (currentFrameIndex !== innerState.currentFrameIndex) {
                  // apply frame directly to live layer store with id remapping
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
              // Save current live layers into current frame before resetting
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
              // apply frame 0 to layer store
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

            // When explicitly updating the current frame's stored data, preserve the layer ids
            // so switching back keeps the same activeLayerId semantics.
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
      };
    },
    { name: 'AnimationStore' }
  )
);
