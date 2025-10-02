import { z } from 'zod';
import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { RunnableSequence } from '@langchain/core/runnables';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { HumanMessage, AIMessage } from '@langchain/core/messages';
import { jsonrepair } from 'jsonrepair';
import {
  OPTIMIZER_SYSTEM_PROMPT,
  CRITIC_SYSTEM_PROMPT,
  DRAW_SYSTEM_PROMPT,
} from '@/features/ai-generation/prompts';

const pixelSchema = z.array(
  z.object({
    x: z.number().int(),
    y: z.number().int(),
    color: z.string(),
  })
);

type Pixel = z.infer<typeof pixelSchema>[number];

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { prompt } = await req.json();
  const signal = req.signal;

  const readableStream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const sendData = (data: object) => {
        const chunk = `data: ${JSON.stringify(data)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      signal.addEventListener('abort', () => {
        console.log('Client closed connection. Aborting server task.');
        controller.close();
      });

      try {
        const llm =
          process.env.LLM_PROVIDER === 'openai'
            ? new ChatOpenAI({
                model: process.env.LLM_MODEL,
                apiKey: process.env.LLM_API_KEY,
                configuration: { baseURL: process.env.LLM_BASE_URL },
                temperature: 0.05,
              })
            : new ChatOllama({
                model: process.env.LLM_MODEL,
                baseUrl: process.env.LLM_BASE_URL,
                temperature: 0.05,
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
              return prompt;
            }
          },
        ]);

        const optimizedPrompt = await optimizerChain.invoke(
          { input: prompt },
          { signal }
        );
        sendData({ type: 'progress', value: 5 });
        sendData({
          type: 'thoughts',
          value: `Optimized Prompt: ${optimizedPrompt}`,
        });

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
                      response.content.replace(/```json|```/g, '').trim()
                    )
                  )
                : response.content;
            const validated = pixelSchema.safeParse(content.pixels || content);
            if (validated.success)
              return {
                pixels: validated.data,
                thoughts: content.thoughts || '',
                error: null,
              };
            throw new Error(validated.error.message);
          } catch (e) {
            return {
              pixels: null,
              thoughts: '',
              error: 'Failed to parse pixel data from AI.',
            };
          }
        };

        const parseCriticResponse = (response: AIMessage) => {
          try {
            const content =
              typeof response.content === 'string'
                ? JSON.parse(
                    jsonrepair(
                      response.content.replace(/```json|```/g, '').trim()
                    )
                  )
                : response.content;
            return z
              .object({ isComplete: z.boolean(), feedback: z.string() })
              .parse(content);
          } catch (e) {
            return { isComplete: false, feedback: 'Error evaluating image.' };
          }
        };

        let messages: (HumanMessage | [string, string])[] = [
          ['system', DRAW_SYSTEM_PROMPT],
          new HumanMessage({
            content: `Prompt: ${optimizedPrompt}\nCurrent pixels: []`,
          }),
        ];
        let iteration = 0;
        const maxIterations = 10;
        let allPixels: Pixel[] = [];

        while (iteration < maxIterations) {
          if (signal.aborted) throw new Error('Request aborted by client.');

          const response: AIMessage = await llm.invoke(messages, { signal });
          const { pixels, thoughts, error } = parsePixelResponse(response);

          if (error) {
            sendData({ type: 'error', value: error });
            break;
          }
          if (thoughts) sendData({ type: 'thoughts', value: thoughts });

          if (pixels && pixels.length > 0) {
            sendData({ type: 'pixels', value: pixels });

            const pixelMap = new Map<string, string>();
            allPixels.forEach((p) => pixelMap.set(`${p.x},${p.y}`, p.color));
            pixels.forEach((p) => pixelMap.set(`${p.x},${p.y}`, p.color));
            allPixels = Array.from(pixelMap, ([key, color]) => {
              const [x, y] = key.split(',').map(Number);
              return { x, y, color };
            });

            const criticResponse = await criticPromptTemplate.pipe(llm).invoke(
              {
                input: optimizedPrompt,
                pixels: JSON.stringify(allPixels),
              },
              { signal }
            );

            const { isComplete, feedback } =
              parseCriticResponse(criticResponse);
            sendData({
              type: 'thoughts',
              value: `Critic Feedback: ${feedback}`,
            });

            if (isComplete) {
              sendData({
                type: 'thoughts',
                value: 'Critic deemed the image complete.',
              });
              break;
            }

            messages = [
              ['system', DRAW_SYSTEM_PROMPT],
              new HumanMessage({
                content: `Current pixels: ${JSON.stringify(allPixels)}\nCritic feedback: "${feedback}"\nContinue drawing.`,
              }),
            ];
          } else {
            sendData({
              type: 'thoughts',
              value: 'AI returned no new pixels. Finishing.',
            });
            break;
          }
          iteration++;
          sendData({
            type: 'progress',
            value: 5 + (iteration / maxIterations) * 90,
          });
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error('API Route Stream Error:', error);
        if (err.name !== 'AbortError') {
          sendData({
            type: 'error',
            value: err.message || 'An unknown server error occurred.',
          });
        }
      } finally {
        console.log('Stream finished.');
        controller.close();
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
