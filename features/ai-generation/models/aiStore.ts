import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useLayerStore } from '@/features/layers/model/layerStore';
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

interface AIState {
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  progress: number;
  thoughts: string[];
  setPrompt: (prompt: string) => void;
  generateImage: () => Promise<void>;
  stopGeneration: () => void;
}

// Schema for pixel data
const pixelSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    color: z.string(),
  })
);

// System prompt for drawing agent (includes current pixels)
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
  "pixels": [{{"x": 32, "y": 25, "color": "#000000FF"}}, {{"x": 33, "y": 24, "color": "#000000FF"}}, {{"x": 34, "y": 25, "color": "#000000FF"}}]
}}
PROMPT: "Blue cat"
CURRENT PIXELS: [{{"x": 32, "y": 30, "color": "#0000FFFF"}}]
OUTPUT:
{{
  "thoughts":  "I see there's already a blue pixel for the cat's body. I need to add the cat's head outline above it and start forming the basic cat shape.",
  "pixels": [{{"x": 31, "y": 28, "color": "#000000FF"}}, {{"x": 32, "y": 27, "color": "#000000FF"}}, {{"x": 33, "y": 28, "color": "#000000FF"}}]
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

// System prompt for critic agent
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
PIXELS: [{{"x": 32, "y": 30, "color": "#FF0000FF"}}]
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

// System prompt for prompt optimizer
const OPTIMIZER_SYSTEM_PROMPT = `
YOU ARE A WORLD-CLASS PROMPT OPTIMIZATION EXPERT SPECIALIZING IN PIXEL ART GENERATION. YOUR TASK IS TO TRANSFORM BASIC USER PROMPTS INTO DETAILED, SPECIFIC INSTRUCTIONS PERFECT FOR CREATING 16x16 PIXEL ART.<optimization_chain_of_thoughts>
FOLLOW THIS EXACT PROCESS:

ANALYZE the user's basic prompt to identify the main subject
IDENTIFY missing details crucial for pixel art (colors, style, features)
CONSIDER the 16x16 canvas limitations and optimal composition
ADD specific visual details, colors, and positioning guidance
ENSURE the prompt is clear and actionable for pixel art creation
</optimization_chain_of_thoughts>
<enhancement_guidelines>
ALWAYS ADD THESE DETAILS:

SPECIFIC COLORS: Primary and accent colors with hex suggestions
KEY FEATURES: Important visual elements that define the subject
STYLE GUIDANCE: Pixel art appropriate styling (outlines, shading)
POSITIONING: Where to place the subject on the 16x16 canvas
SIZE GUIDANCE: How much of the canvas the subject should occupy
</enhancement_guidelines>
<output_format>
OUTPUT EXACTLY THIS JSON FORMAT:
{{
"optimizedPrompt": "detailed enhanced prompt string"
}}
</output_format>
<optimization_examples>
USER PROMPT: "cat"
OPTIMIZED: {{"optimizedPrompt": "A 16x16 pixel art of an orange tabby cat with black stripes, featuring pointy triangular ears, bright green eyes, pink nose, and white chest. The cat should be centered, facing forward, with black pixel outlines and occupy about 70% of the canvas height. Use transparent background."}}
USER PROMPT: "tree"
OPTIMIZED: {{"optimizedPrompt": "A 16x16 pixel art of a large green oak tree with brown trunk, featuring a full leafy crown in various shades of green (#228B22, #32CD32), thick brown trunk (#8B4513), and small branches. Center the tree with roots visible at bottom, occupying 80% of canvas height. Use light blue sky background."}}
USER PROMPT: "house"
OPTIMIZED: {{"optimizedPrompt": "A 16x16 pixel art of a cozy cottage with red brick walls (#B22222), dark gray roof (#2F4F4F), yellow glowing windows (#FFFF00), brown wooden door (#8B4513), and green grass at the base. Include a small chimney with smoke. Center the house occupying 60% of canvas, transparent background."}}
</optimization_examples>
<color_suggestions>
USE PIXEL ART APPROPRIATE COLORS:

VIBRANT: High contrast, saturated colors work best
OUTLINES: Usually black (#000000FF) or dark variants
HIGHLIGHTS: Lighter versions of base colors
SHADOWS: Darker versions of base colors
TRANSPARENCY: Use #XXXXXXFF for opaque, lower values for transparency
</color_suggestions>
<what_not_to_do>

DO NOT keep prompts vague or generic
DO NOT forget to specify colors and positioning
DO NOT ignore the 16x16 canvas size limitations
DO NOT add unrealistic detail for pixel art medium
DO NOT output invalid JSON format
DO NOT make prompts overly complex or confusing
</what_not_to_do>
`.trim();

export const useAIStore = create<AIState>()(
  devtools(
    (set, get) => {
      let abortController: AbortController | null = null;

      return {
        prompt: '',
        isGenerating: false,
        error: null,
        progress: 0,
        thoughts: [],
        setPrompt: (prompt) => set({ prompt }),
        stopGeneration: () => {
          if (abortController) {
            abortController.abort();
            set({
              isGenerating: false,
              progress: 0,
              error: 'Generation stopped by user',
            });
          }
        },
        generateImage: async () => {
          const { prompt } = get();
          if (!prompt) {
            set({ error: 'Please enter a prompt' });
            return;
          }

          set({ isGenerating: true, error: null, progress: 0, thoughts: [] });
          abortController = new AbortController();
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
                  return z
                    .object({ optimizedPrompt: z.string() })
                    .parse(content).optimizedPrompt;
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
            set({ progress: 5 });

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
              const { setLayerPixels } = useLayerStore.getState();
              const activeLayerId = useLayerStore.getState().activeLayerId;
              const pixelData = pixels
                .map(({ x, y, color }) => ({ x, y, color: hexToInt(color) }))
                .filter((p) => p.color !== 0);

              if (pixelData.length > 0) {
                setLayerPixels(activeLayerId, pixelData);
                set((state) => ({
                  progress: Math.min(state.progress + 10, 90),
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
                    set({ error });
                    break;
                  }

                  if (thoughts) {
                    set((state) => ({
                      thoughts: [
                        ...state.thoughts,
                        `Drawing Agent (Iteration ${iteration + 1}): ${thoughts}`,
                      ],
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
                      thoughts: [
                        ...state.thoughts,
                        `Critic Feedback (Iteration ${iteration + 1}): ${feedback}`,
                      ],
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
                  set({ error: 'No pixels were drawn by the AI.' });
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
              set({ error: 'Generation stopped by user' });
            } else {
              set({ error: (error as Error).message });
            }
          } finally {
            set({ isGenerating: false, progress: 100 });
            abortController = null;
          }
        },
      };
    },
    { name: 'AIStore' }
  )
);
