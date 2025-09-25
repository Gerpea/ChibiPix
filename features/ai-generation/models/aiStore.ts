import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { z } from 'zod';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { hexToInt } from '@/shared/utils/colors';
import { jsonrepair } from 'jsonrepair';
import {
  useAnimationStore,
  type Layer,
} from '@/features/animation/model/animationStore';

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
  currentPrompt: string;
  setCurrentPrompt: (prompt: string) => void;
  startGeneration: () => Promise<void>;
  stopGeneration: (id: string) => void;
}

// Schema for pixel data
const pixelSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    color: z.string(),
  })
);

// System prompts (unchanged, included for completeness)
const DRAW_SYSTEM_PROMPT = `
YOU ARE A WORLD-CLASS PIXEL ART EXPERT SPECIALIZING IN 16x16 PIXEL IMAGES. YOUR TASK IS TO CREATE STUNNING PIXEL ART BY DRAWING NEW PIXELS BASED ON THE GIVEN PROMPT AND CURRENT CANVAS STATE.<chain_of_thoughts>
FOLLOW THIS EXACT REASONING PROCESS:

ANALYZE the prompt to understand what needs to be drawn
EXAMINE current pixels to see what already exists
IDENTIFY what specific elements are missing or need improvement
PLAN which pixels to draw next (prioritize outlines, then fill)
CHOOSE appropriate colors that match the prompt requirements
OUTPUT the new pixels in the correct JSON format
</chain_of_thoughts>
<output_format>
OUTPUT EXACTLY THIS JSON FORMAT:
{{
  "thoughts": "Your reasoning process (this will be shown to the user)",
  "pixels": "JSON array of new pixels to draw"
}}
FORMAT EXACTLY LIKE THIS:
{{
  "thoughts": "Your step-by-step thinking about what you're drawing and why",
  "pixels": [{{"x": 5, "y": 5, "color": "#FF0000FF"}}, {{"x": 6, "y": 5, "color": "#FF0000FF"}}]
}}
</output_format>
<drawing_guidelines>
COORDINATES: x and y range from 0 to 15
COLORS: Use #RRGGBBAA format (AA = alpha/transparency, FF = opaque)
STRATEGY: Start with outlines, then fill interiors
PIXEL COUNT: Draw 25-55 pixels at once to create meaningful parts (outline, fill, details).
POSITIONING: Center main subjects, use full canvas effectively
COLORS: Use vibrant, contrasting colors appropriate for pixel art
</drawing_guidelines> <examples>
PROMPT: "Red apple"
CURRENT PIXELS: []
OUTPUT:
{{
  "thoughts":  "I need to draw a red apple. I'll start with the basic circular outline in the center of the canvas, then add the stem area.",
  "pixels": [{{"x": 5, "y": 5, "color": "#000000FF"}}, {{"x": 6, "y": 5, "color": "#000000FF"}}]
}}
PROMPT: "Blue cat"
CURRENT PIXELS: [{{"x": 5, "y": 5, "color": "#0000FFFF"}}]
OUTPUT:
{{
  "thoughts":  "I see there's already a blue pixel for the cat's body. I need to add the cat's head outline above it and start forming the basic cat shape.",
  "pixels": [{{"x": 4, "y": 4, "color": "#000000FF"}}, {{"x": 5, "y": 3, "color": "#000000FF"}}, {{"x": 6, "y": 4, "color": "#000000FF"}}]
}}
</examples>
<what_not_to_do>
DO NOT output anything other than THOUGHTS and PIXELS
DO NOT use invalid coordinates (outside 0-15 range)
DO NOT use invalid color formats
DO NOT draw too many pixels at once (max 55 per iteration)
DO NOT ignore the current pixels context
DO NOT create disconnected random pixels
</what_not_to_do>
`.trim();

const CRITIC_SYSTEM_PROMPT = `
YOU ARE A WORLD-CLASS PIXEL ART CRITIC AND EVALUATOR. YOUR EXPERTISE LIES IN ASSESSING WHETHER A 16x16 PIXEL ART IMAGE ACCURATELY REPRESENTS THE GIVEN PROMPT AND PROVIDING CONSTRUCTIVE FEEDBACK FOR IMPROVEMENT.<evaluation_chain_of_thoughts>
FOLLOW THIS EXACT EVALUATION PROCESS:

COMPARE the current pixels against the prompt requirements
IDENTIFY which key elements are present and which are missing
ASSESS the overall composition, colors, and recognizability
DETERMINE if the artwork is complete or needs more work
PROVIDE specific, actionable feedback for next steps
</evaluation_chain_of_thoughts>
<completion_criteria>
MARK AS COMPLETE (true) ONLY WHEN:
ALL major elements from the prompt are clearly visible
The artwork is recognizable as the requested subject
Colors match the prompt requirements
The composition uses the canvas effectively
Basic details and features are present
MARK AS INCOMPLETE (false) WHEN:
Missing key elements from the prompt
Artwork is not recognizable
Only outlines exist without proper filling
Colors don't match requirements
Composition needs improvement
</completion_criteria>
<output_format>
OUTPUT EXACTLY THIS JSON FORMAT:
{{
"isComplete": boolean,
"feedback": "specific description of what's missing or what to draw next"
}}
</output_format>
<feedback_guidelines>
PROVIDE SPECIFIC, ACTIONABLE FEEDBACK:
IDENTIFY exactly what elements are missing
SUGGEST specific areas to work on next
MENTION color requirements if not met
GUIDE toward completing the most important features first
BE ENCOURAGING but PRECISE about what needs improvement
</feedback_guidelines>
<examples>
PROMPT: "Red apple"
PIXELS: [{{"x": 5, "y": 5, "color": "#FF0000FF"}}]
OUTPUT: {{"isComplete": false, "feedback": "Only one red pixel exists. Need to draw the complete apple outline first, then fill with red color and add a brown stem on top."}}
PROMPT: "Blue cat with green eyes"
PIXELS: [multiple pixels forming cat outline and blue fill]
OUTPUT: {{"isComplete": false, "feedback": "The blue cat body and outline are complete, but the green eyes are missing. Add two green pixels for eyes in the head area."}}
PROMPT: "Yellow sun"
PIXELS: [complete sun with rays and face]
OUTPUT: {{"isComplete": true, "feedback": "Perfect! The yellow sun is complete with rays, circular body, and facial features. The artwork successfully represents the prompt."}} 
</examples>
<what_not_to_do>
DO NOT be overly lenient - ensure quality standards
DO NOT provide vague feedback like "needs more work"
DO NOT mark incomplete work as complete
DO NOT ignore color requirements from the prompt
DO NOT output invalid JSON format
</what_not_to_do>
`.trim();

const OPTIMIZER_SYSTEM_PROMPT = `
YOU ARE A PIXEL ART PROMPT OPTIMIZER FOR TINY 16x16 CANVASES. YOUR TASK IS TO MAKE MINIMAL BUT HELPFUL ADJUSTMENTS TO USER PROMPTS, KEEPING THEM SIMPLE AND ACHIEVABLE.<optimization_chain_of_thoughts>
FOLLOW THIS PROCESS:
IDENTIFY the main subject from user prompt
KEEP IT SIMPLE - 16x16 can only fit basic shapes
ADD only 1-2 essential details that help recognition
SUGGEST 1-2 main colors maximum
ENSURE the result is actually drawable in 16x16 pixels
</optimization_chain_of_thoughts>
<simplification_guidelines>
FOR 16x16 PIXEL ART, ONLY ADD:
ONE main color (plus black for outline)
ONE key identifying feature if space allows
Basic positioning (centered)
Simple shape description
NO complex details, patterns, or multiple features
</simplification_guidelines>
<output_format>
OUTPUT EXACTLY THIS JSON FORMAT:
{{
"optimizedPrompt": "simple, minimal enhanced prompt"
}}
</output_format><realistic_examples>
USER PROMPT: "cat"
OPTIMIZED: {{"optimizedPrompt": "A simple 16x16 pixel art of a cat head in orange with black outline, featuring pointy ears. Centered on transparent background."}}
USER PROMPT: "tree"
OPTIMIZED: {{"optimizedPrompt": "A basic 16x16 pixel art of a green tree with brown trunk. Simple leafy top, centered on transparent background."}}
USER PROMPT: "house"
OPTIMIZED: {{"optimizedPrompt": "A simple 16x16 pixel art of a small house with red walls and dark roof. Basic square shape with triangle roof, centered."}}
USER PROMPT: "apple"
OPTIMIZED: {{"optimizedPrompt": "A 16x16 pixel art of a red apple. Simple circular shape with black outline, centered on transparent background."}}
USER PROMPT: "car"
OPTIMIZED: {{"optimizedPrompt": "A basic 16x16 pixel art of a blue car. Simple rectangular shape with black wheels, side view, centered."}}
</realistic_examples><what_not_to_do>
DO NOT add multiple colors or complex details
DO NOT suggest features that won't fit in 16x16
DO NOT make the prompt longer than necessary
DO NOT add unrealistic expectations for tiny canvas
DO NOT ignore the severe space limitations
DO NOT change the core subject requested
</what_not_to_do>
`.trim();

function findEmpty16x16(
  layers: Layer[],
  aiAreas: Record<string, { startX: number; startY: number }>
): { startX: number; startY: number } {
  const occupied: Set<string> = new Set();
  const GAP = 2; // 2-pixel gap

  // Mark existing pixels as occupied
  layers.forEach((layer) => {
    layer.pixels.forEach((_, key) => {
      const [x, y] = key.split(',').map(Number);
      // Add gap around each pixel
      for (let dy = -GAP; dy <= GAP; dy++) {
        for (let dx = -GAP; dx <= GAP; dx++) {
          occupied.add(`${x + dx},${y + dy}`);
        }
      }
    });
  });

  // Mark AI areas as occupied, including gap
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
      currentPrompt: '',
      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
      startGeneration: async () => {
        const id = Date.now().toString();
        const prompt = get().currentPrompt;
        if (!prompt) {
          return;
        }

        const animationState = useAnimationStore.getState();
        const currentFrame =
          animationState.frames[animationState.currentFrameIndex];
        if (!currentFrame) {
          // Handle error if no frame exists
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
        const activeLayerIdForGeneration = activeLayerId;
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

          // Prompt optimizer chain
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
                return prompt; // Fallback to original prompt
              }
            },
          ]);

          // Optimize the prompt
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

          // Drawing agent chain
          const drawPromptTemplate = ChatPromptTemplate.fromMessages([
            ['system', DRAW_SYSTEM_PROMPT],
            ['human', 'Prompt: {input}\nCurrent pixels: {pixels}'],
            new MessagesPlaceholder('agent_scratchpad'),
          ]);

          // Critic agent chain
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
                        thoughts: [
                          ...state.generations[id].thoughts,
                          `Drawing Agent (Iteration ${iteration + 1}): ${thoughts}`,
                        ],
                      },
                    },
                  }));
                }

                if (pixels && pixels.length > 0) {
                  const drawnPixels = await executeDrawPixel(pixels);
                  totalPixels += drawnPixels.length;
                  allPixels = [...allPixels, ...pixels];

                  // Evaluate with critic
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
                  set((state) => ({
                    generations: {
                      ...state.generations,
                      [id]: {
                        ...state.generations[id],
                        thoughts: [
                          ...state.generations[id].thoughts,
                          `Critic Feedback (Iteration ${iteration + 1}): ${feedback}`,
                        ],
                      },
                    },
                  }));
                  console.log('Critic feedback:', feedback);

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
                  break; // No pixels drawn, stop iteration
                }

                // Invoke next iteration
                response = await llm.invoke(messages, { signal });
                iteration++;
                // await new Promise((resolve) => setTimeout(resolve, 100)); // Throttle
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

          // Run the agent
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
