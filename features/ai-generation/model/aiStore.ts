// src/features/ai/model/aiStore.ts

import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { hexToInt } from '@/shared/utils/colors';
import {
  useAnimationStore,
  type Layer,
} from '@/features/animation/model/animationStore';

// ... (Pixel schema, Generation/AIState interfaces, findEmpty16x16, and commitPixelsToLayer functions remain the same)
// They are client-side logic and do not need changes.

const pixelSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    color: z.string(),
  })
);

type Pixel = z.infer<typeof pixelSchema>[number];

interface Generation {
  id: string;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  progress: number;
  thoughts: string[];
  abortController: AbortController | null;
  area: { startX: number; startY: number };
  layerId: string;
  generatedPixels: Pixel[];
}

interface AIState {
  generations: Record<string, Generation>;
  startGeneration: (prompt: string) => Promise<void>;
  stopGeneration: (id: string) => void;
}

function findEmpty16x16(
  layers: Layer[],
  activeGenerations: Record<string, { startX: number; startY: number }>
): { startX: number; startY: number } {
  // ... (Your existing findEmpty16x16 logic here)
  const occupied: Set<string> = new Set();
  const GAP = 2;

  layers.forEach((layer) => {
    layer.pixels.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      for (let dy = -GAP; dy <= GAP; dy++) {
        for (let dx = -GAP; dx <= GAP; dx++) {
          occupied.add(`${x + dx},${y + dy}`);
        }
      }
    });
  });

  Object.values(activeGenerations).forEach((area) => {
    for (let dy = -GAP; dy < 16 + GAP; dy++) {
      for (let dx = -GAP; dx < 16 + GAP; dx++) {
        const key = `${area.startX + dx},${area.startY + dy}`;
        occupied.add(key);
      }
    }
  });

  const step = 16;
  const maxSearch = 10000;
  for (let startY = 0; startY < maxSearch; startY += step) {
    for (let startX = 0; startX < maxSearch; startX += step) {
      let isEmpty = true;
      check: for (let dy = 0; dy < 16; dy++) {
        for (let dx = 0; dx < 16; dx++) {
          const key = `${startX + dx},${startY + dy}`;
          if (occupied.has(key)) {
            isEmpty = false;
            break check;
          }
        }
      }
      if (isEmpty) {
        return { startX, startY };
      }
    }
  }
  throw new Error('No empty 16x16 area found with sufficient gap');
}

const commitPixelsToLayer = (generation: Generation) => {
  if (generation.generatedPixels.length > 0 && generation.area) {
    const { setLayerPixels } = useAnimationStore.getState();
    const pixelData = generation.generatedPixels
      .map(({ x, y, color }) => ({
        x: generation.area.startX + x,
        y: generation.area.startY + y,
        color: hexToInt(color),
      }))
      .filter((p) => p.color !== 0);

    if (pixelData.length > 0) {
      setLayerPixels(generation.layerId, pixelData, true);
    }
  }
};

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => ({
      generations: {},
      startGeneration: async (prompt: string) => {
        const id = Date.now().toString();

        // ... (Your client-side logic to find an area remains the same)
        const animationState = useAnimationStore.getState();
        const currentFrame =
          animationState.frames[animationState.currentFrameIndex];
        if (!currentFrame) {
          /* handle error */ return;
        }
        const { layers, activeLayerId } = currentFrame;
        const activeAIAreas = Object.entries(get().generations).reduce(
          (acc, [genId, gen]) => {
            if (gen.isGenerating && gen.area) acc[genId] = gen.area;
            return acc;
          },
          {} as Record<string, { startX: number; startY: number }>
        );
        let area;
        try {
          area = findEmpty16x16(layers, activeAIAreas);
        } catch (e) {
          /* handle error */ return;
        }

        const abortController = new AbortController();

        set((state) => ({
          generations: {
            ...state.generations,
            [id]: {
              id,
              prompt,
              isGenerating: true,
              error: null,
              progress: 0,
              thoughts: [],
              abortController,
              area,
              layerId: activeLayerId,
              generatedPixels: [],
            },
          },
        }));

        try {
          const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
            signal: abortController.signal,
          });

          if (!response.ok)
            throw new Error(`Server error: ${response.statusText}`);
          if (!response.body) throw new Error('Response body is missing');

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const messages = buffer.split('\n\n');
            buffer = messages.pop() || ''; // Keep the last, possibly incomplete, message in buffer

            for (const message of messages) {
              if (message.startsWith('data: ')) {
                try {
                  const jsonString = message.substring(6);
                  const data = JSON.parse(jsonString);

                  // Update state based on the event type from the server
                  if (data.type === 'progress') {
                    set((state) => ({
                      generations: {
                        ...state.generations,
                        [id]: {
                          ...state.generations[id],
                          progress: data.value,
                        },
                      },
                    }));
                  } else if (data.type === 'thoughts') {
                    set((state) => ({
                      generations: {
                        ...state.generations,
                        [id]: {
                          ...state.generations[id],
                          thoughts: [
                            ...state.generations[id].thoughts,
                            data.value,
                          ],
                        },
                      },
                    }));
                  } else if (data.type === 'pixels') {
                    set((state) => {
                      const gen = state.generations[id];
                      if (!gen) return state;
                      const pixelMap = new Map<string, string>();
                      gen.generatedPixels.forEach((p) =>
                        pixelMap.set(`${p.x},${p.y}`, p.color)
                      );
                      data.value.forEach((p: Pixel) =>
                        pixelMap.set(`${p.x},${p.y}`, p.color)
                      );
                      const mergedPixels = Array.from(
                        pixelMap,
                        ([key, color]) => {
                          const [x, y] = key.split(',').map(Number);
                          return { x, y, color };
                        }
                      );
                      return {
                        generations: {
                          ...state.generations,
                          [id]: { ...gen, generatedPixels: mergedPixels },
                        },
                      };
                    });
                  } else if (data.type === 'error') {
                    throw new Error(data.value);
                  }
                } catch (e) {
                  console.error('Error parsing stream message:', message, e);
                }
              }
            }
          }
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            set((state) => ({
              generations: {
                ...state.generations,
                [id]: {
                  ...state.generations[id],
                  error: 'Generation stopped by user.',
                },
              },
            }));
          } else {
            set((state) => ({
              generations: {
                ...state.generations,
                [id]: {
                  ...state.generations[id],
                  error: (error as Error).message,
                },
              },
            }));
          }
        } finally {
          const finalGen = get().generations[id];
          if (finalGen) commitPixelsToLayer(finalGen);
          set((state) => ({
            generations: {
              ...state.generations,
              [id]: {
                ...state.generations[id],
                isGenerating: false,
                progress: 100,
                abortController: null,
              },
            },
          }));
        }
      },
      stopGeneration: (id) => {
        const gen = get().generations[id];
        if (gen?.abortController) {
          gen.abortController.abort();
        }
      },
    }),
    { name: 'AIStore' }
  )
);
