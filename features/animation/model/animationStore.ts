import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore, type Layer } from '@/features/layers/model/layerStore';

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
    return {
      ...layer,
      id: newId,
      pixels: new Map(layer.pixels),
    };
  });
  return { layers: clonedLayers, idMap };
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
        duration: 100,
      };

      return {
        frames: [initialFrame],
        currentFrameIndex: 0,
        fps: 12,
        isPlaying: false,
        timer: null,
        currentTime: 0,

        addFrame: (duplicateCurrent = true) => {
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
            duration: get().frames[get().currentFrameIndex].duration,
          };

          set((state) => {
            const frames = [...state.frames, newFrame];
            const newIndex = frames.length - 1;
            state.setCurrentFrame(newIndex);
            useHistoryStore.getState().push();
            return { frames, currentFrameIndex: newIndex };
          });
        },

        removeFrame: (index) => {
          if (get().frames.length <= 1) return;
          set((state) => {
            const frames = state.frames.filter((_, i) => i !== index);
            let newIndex = state.currentFrameIndex;
            if (newIndex >= frames.length) newIndex = frames.length - 1;
            if (newIndex >= 0) {
              state.setCurrentFrame(newIndex);
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
            return { frames, currentFrameIndex };
          });
        },

        setCurrentFrame: (index) => {
          set((state) => {
            if (index < 0 || index >= state.frames.length) return state;
            const frame = state.frames[index];
            const { layers: clonedLayers, idMap } = deepCloneLayers(
              frame.layers
            );
            let newActiveLayerId =
              idMap.get(frame.activeLayerId) ||
              clonedLayers[0]?.id ||
              frame.activeLayerId;
            useLayerStore.setState({
              layers: clonedLayers,
              activeLayerId: newActiveLayerId,
            });

            const layerState = useLayerStore.getState();
            if (
              !layerState.layers.find(
                (l) => l.id === layerState.activeLayerId
              ) &&
              layerState.layers.length > 0
            ) {
              newActiveLayerId = layerState.layers[0].id;
              useLayerStore.getState().setActiveLayer(newActiveLayerId);
            }

            // const currentTime = state.frames.slice(0, index).reduce((acc, f) => acc + f.duration, 0);
            return { currentFrameIndex: index };
          });
        },

        setFps: (fps) => {
          set((state) => {
            if (fps < 1) return state;
            if (state.isPlaying && state.timer) {
              cancelAnimationFrame(state.timer);
              state.play();
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
            const currentTime = Math.max(0, Math.min(totalDuration, time));
            let currentFrameIndex = 0;
            let accumulated = 0;

            for (let i = 0; i < state.frames.length; i++) {
              accumulated += state.frames[i].duration;
              if (currentTime < accumulated) {
                currentFrameIndex = i;
                break;
              }
            }

            if (currentFrameIndex !== state.currentFrameIndex) {
              state.setCurrentFrame(currentFrameIndex);
            }

            return { currentTime, currentFrameIndex };
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
                  currentTime = currentTime % totalDuration; // Loop
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
                  innerState.setCurrentFrame(currentFrameIndex);
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
              state.setCurrentFrame(0);
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
            const { layers: clonedLayers, idMap } = deepCloneLayers(layers);
            const newActiveLayerId =
              idMap.get(activeLayerId) || clonedLayers[0]?.id || activeLayerId;
            const newFrames = [...state.frames];
            newFrames[state.currentFrameIndex] = {
              ...newFrames[state.currentFrameIndex],
              layers: clonedLayers,
              activeLayerId: newActiveLayerId,
            };
            return { frames: newFrames };
          });
        },
      };
    },
    { name: 'AnimationStore' }
  )
);
