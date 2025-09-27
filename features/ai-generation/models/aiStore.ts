import { z } from 'zod';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { jsonrepair } from 'jsonrepair';
import { hexToInt } from '@/shared/utils/colors';
import {
  useAnimationStore,
  type Layer,
} from '@/features/animation/model/animationStore';
import {
  OPTIMIZER_SYSTEM_PROMPT,
  CRITIC_SYSTEM_PROMPT,
  DRAW_SYSTEM_PROMPT,
} from '../prompts';

interface Generation {
  id: string;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  progress: number;
  thoughts: string[];
  abortController: AbortController | null;
  area: { startX: number; startY: number } | null;
}

interface AIState {
  generations: Record<string, Generation>;
  startGeneration: (prompt: string) => Promise<void>;
  stopGeneration: (id: string) => void;
}

const pixelSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    color: z.string(),
  })
);

function findEmpty16x16(
  layers: Layer[],
  aiAreas: Record<string, { startX: number; startY: number }>
): { startX: number; startY: number } {
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

  Object.values(aiAreas).forEach((area) => {
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

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => ({
      generations: {},
      startGeneration: async (prompt: string) => {
        const id = Date.now().toString();

        const animationState = useAnimationStore.getState();
        const currentFrame =
          animationState.frames[animationState.currentFrameIndex];
        if (!currentFrame) {
          set((state) => ({
            generations: {
              ...state.generations,
              [id]: {
                id,
                prompt,
                isGenerating: false,
                error: 'Cannot generate without an active frame.',
                progress: 0,
                thoughts: [],
                abortController: null,
                area: null,
              },
            },
          }));
          return;
        }
        const { layers, activeLayerId } = currentFrame;
        const { aiAreas } = animationState;

        let area;
        try {
          area = findEmpty16x16(layers, aiAreas);
        } catch (e) {
          set({
            generations: {
              ...get().generations,
              [id]: {
                id,
                prompt,
                isGenerating: false,
                error: (e as Error).message,
                progress: 0,
                thoughts: [],
                abortController: null,
                area: null,
              },
            },
          });
          return;
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
            },
          },
        }));

        useAnimationStore.getState().addAIArea(id, area);

        const signal = abortController.signal;

        try {
          // Initialize LLM based on provider
          const llm =
            process.env.NEXT_PUBLIC_LLM_PROVIDER === 'openai'
              ? new ChatOpenAI({
                  model: process.env.NEXT_PUBLIC_LLM_MODEL,
                  apiKey: process.env.NEXT_PUBLIC_LLM_API_KEY,
                  configuration: {
                    baseURL: process.env.NEXT_PUBLIC_LLM_BASE_URL,
                  },
                  temperature: 0.05,
                  format: 'json',
                })
              : new ChatOllama({
                  model: process.env.NEXT_PUBLIC_LLM_MODEL,
                  baseUrl: process.env.NEXT_PUBLIC_LLM_BASE_URL,
                  apiKey: process.env.NEXT_PUBLIC_LLM_API_KEY,
                  temperature: 0.05,
                  format: 'json',
                });

          const optimizerPromptTemplate = ChatPromptTemplate.fromMessages([
            ['system', OPTIMIZER_SYSTEM_PROMPT],
            ['human', '{input}'],
          ]);

          const optimizerChain = RunnableSequence.from([
            optimizerPromptTemplate,
            llm,
            (response: AIMessage) => {
              try {
                const content =
                  typeof response.content === 'string'
                    ? JSON.parse(jsonrepair(response.content))
                    : response.content;
                return z.object({ optimizedPrompt: z.string() }).parse(content)
                  .optimizedPrompt;
              } catch (e) {
                console.error('Optimizer JSON parsing error:', e);
                return prompt;
              }
            },
          ]);

          const optimizedPrompt = await optimizerChain.invoke(
            { input: prompt },
            { signal }
          );
          set((state) => ({
            generations: {
              ...state.generations,
              [id]: {
                ...state.generations[id],
                progress: 5,
              },
            },
          }));

          const drawPromptTemplate = ChatPromptTemplate.fromMessages([
            ['system', DRAW_SYSTEM_PROMPT],
            ['human', 'Prompt: {input}\nCurrent pixels: {pixels}'],
            new MessagesPlaceholder('agent_scratchpad'),
          ]);

          const criticPromptTemplate = ChatPromptTemplate.fromMessages([
            ['system', CRITIC_SYSTEM_PROMPT],
            ['human', 'Prompt: {input}\nCurrent pixels: {pixels}'],
          ]);

          const parsePixelResponse = (response: AIMessage) => {
            try {
              const content =
                typeof response.content === 'string'
                  ? JSON.parse(
                      jsonrepair(
                        response.content
                          .replace('```json', '')
                          .replace('```', '')
                      )
                    )
                  : response.content;
              const validated = pixelSchema.safeParse(
                content.pixels || content
              );
              if (validated.success) {
                return {
                  pixels: validated.data,
                  thoughts: content.thoughts || '',
                  error: null,
                };
              }
              throw new Error('Invalid pixel schema');
            } catch (e) {
              console.error('Pixel JSON parsing error:', e);
              return {
                pixels: null,
                thoughts: '',
                error: 'Failed to parse pixel data',
              };
            }
          };

          const parseCriticResponse = (response: AIMessage) => {
            try {
              const content =
                typeof response.content === 'string'
                  ? JSON.parse(
                      jsonrepair(
                        response.content
                          .replace('```json', '')
                          .replace('```', '')
                      )
                    )
                  : response.content;
              return z
                .object({
                  isComplete: z.boolean(),
                  feedback: z.string(),
                })
                .parse(content);
            } catch (e) {
              console.error('Critic JSON parsing error:', e);
              return {
                isComplete: false,
                feedback: 'Error evaluating image',
              };
            }
          };

          const executeDrawPixel = async (
            pixels: { x: number; y: number; color: string }[]
          ) => {
            const { setLayerPixels } = useAnimationStore.getState();
            const pixelData = pixels
              .map(({ x, y, color }) => ({
                x: area.startX + x,
                y: area.startY + y,
                color: hexToInt(color),
              }))
              .filter((p) => p.color !== 0);

            if (pixelData.length > 0) {
              setLayerPixels(activeLayerId, pixelData, true);
              set((state) => ({
                generations: {
                  ...state.generations,
                  [id]: {
                    ...state.generations[id],
                    progress: Math.min(state.generations[id].progress + 10, 90),
                  },
                },
              }));
            }

            return pixelData;
          };

          const agent = RunnableSequence.from([
            drawPromptTemplate,
            llm,
            async (response: AIMessage, { signal }) => {
              let messages = [
                ['system', DRAW_SYSTEM_PROMPT],
                new HumanMessage({
                  content: `Prompt: ${optimizedPrompt}\nCurrent pixels: []`,
                }),
              ];
              let iteration = 0;
              const maxIterations = 50;
              let totalPixels = 0;
              let allPixels: { x: number; y: number; color: string }[] = [];

              while (iteration < maxIterations) {
                signal.throwIfAborted();

                const { pixels, thoughts, error } =
                  parsePixelResponse(response);
                if (error) {
                  set((state) => ({
                    generations: {
                      ...state.generations,
                      [id]: {
                        ...state.generations[id],
                        error,
                      },
                    },
                  }));
                  break;
                }

                if (thoughts) {
                  set((state) => ({
                    generations: {
                      ...state.generations,
                      [id]: {
                        ...state.generations[id],
                        thoughts: [...state.generations[id].thoughts, thoughts],
                      },
                    },
                  }));
                }

                if (pixels && pixels.length > 0) {
                  const drawnPixels = await executeDrawPixel(pixels);
                  totalPixels += drawnPixels.length;
                  allPixels = [...allPixels, ...pixels];

                  const criticResponse = await criticPromptTemplate
                    .pipe(llm)
                    .invoke(
                      {
                        input: optimizedPrompt,
                        pixels: JSON.stringify(allPixels),
                      },
                      { signal }
                    );

                  const { isComplete, feedback } =
                    parseCriticResponse(criticResponse);

                  if (isComplete) {
                    break;
                  }

                  messages = [
                    ['system', DRAW_SYSTEM_PROMPT],
                    new HumanMessage({
                      content: `Current pixels: ${JSON.stringify(allPixels)}\nCritic feedback: "${feedback}"\nContinue drawing, respond only with valid JSON array of pixels.`,
                    }),
                  ];
                } else {
                  break;
                }

                response = await llm.invoke(messages, { signal });
                iteration++;
              }

              if (totalPixels === 0) {
                set((state) => ({
                  generations: {
                    ...state.generations,
                    [id]: {
                      ...state.generations[id],
                      error: 'No pixels were drawn by the AI.',
                    },
                  },
                }));
              }

              return response;
            },
          ]);

          await agent.invoke(
            { input: optimizedPrompt, agent_scratchpad: [], pixels: '[]' },
            { signal }
          );
        } catch (error) {
          if (signal.aborted) {
            set((state) => ({
              generations: {
                ...state.generations,
                [id]: {
                  ...state.generations[id],
                  error: 'Generation stopped by user',
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
          set((state) => ({
            generations: {
              ...state.generations,
              [id]: {
                ...state.generations[id],
                isGenerating: false,
                abortController: null,
                progress: 100,
              },
            },
          }));
          useAnimationStore.getState().removeAIArea(id);
        }
      },
      stopGeneration: (id) => {
        const gen = get().generations[id];
        if (gen && gen.abortController) {
          gen.abortController.abort();
          set((state) => ({
            generations: {
              ...state.generations,
              [id]: {
                ...state.generations[id],
                isGenerating: false,
                error: 'Generation stopped by user',
              },
            },
          }));
          useAnimationStore.getState().removeAIArea(id);
        }
      },
    }),
    { name: 'AIStore' }
  )
);
