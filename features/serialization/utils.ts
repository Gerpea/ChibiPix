import { Frame, Layer } from '@/features/animation/model/animationStore';

const workerURL = '/workers/serialization.js';

export interface ExportProgress {
  layerId: string; // Composite key: "frameId|layerId"
  progress: number;
}

export interface ImportProgress {
  layerId: string; // Composite key: "frameId|layerId"
  progress: number;
}

// Intermediate structure for parsing the .anim file
interface ParsedLayerData {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  pixels: string; // RLE string
}

interface ParsedFrameData {
  id: string;
  name: string;
  duration: number;
  activeLayerId: string;
  layers: ParsedLayerData[];
}

/**
 * Validates and parses the .anim file format.
 */
function validateAndParseAnimationData(data: string): {
  fps: number;
  frames: ParsedFrameData[];
} {
  const lines = data.trim().split('\n');
  if (lines.length < 2 || !lines[0].startsWith('#ANIMATION')) {
    throw new Error('Invalid .anim format: Missing #ANIMATION header.');
  }

  if (!lines[1].startsWith('FPS:')) {
    throw new Error('Invalid .anim format: Missing FPS property on line 2.');
  }
  const fps = parseInt(lines[1].split(':')[1]);
  if (isNaN(fps)) {
    throw new Error('Invalid .anim format: Invalid FPS value.');
  }

  const frames: ParsedFrameData[] = [];
  let currentFrame: ParsedFrameData | null = null;
  let expectedLayerCount = 0;

  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#FRAME')) {
      if (currentFrame) {
        if (currentFrame.layers.length !== expectedLayerCount) {
          throw new Error(
            `Layer count mismatch for frame "${currentFrame.name}". Expected ${expectedLayerCount}, found ${currentFrame.layers.length}.`
          );
        }
        frames.push(currentFrame);
      }
      currentFrame = {
        id: '',
        name: '',
        duration: 100,
        activeLayerId: '',
        layers: [],
      };
      expectedLayerCount = 0;
    } else if (currentFrame) {
      if (line.startsWith('ID:')) {
        currentFrame.id = line.substring(3);
      } else if (line.startsWith('NAME:')) {
        currentFrame.name = line.substring(5);
      } else if (line.startsWith('DURATION:')) {
        currentFrame.duration = parseInt(line.substring(9));
      } else if (line.startsWith('ACTIVELAYER:')) {
        currentFrame.activeLayerId = line.substring(12);
      } else if (line.startsWith('#LAYERS:')) {
        expectedLayerCount = parseInt(line.split(':')[1]);
        if (isNaN(expectedLayerCount)) {
          throw new Error(
            `Invalid layer count for frame "${currentFrame.name}".`
          );
        }
      } else if (currentFrame.layers.length < expectedLayerCount) {
        const [id, name, visibleStr, lockedStr, pixels] = line.split(';', 5);
        if (!id || !name || !visibleStr || !lockedStr || pixels === undefined) {
          throw new Error(`Malformed layer data at line ${i + 1}.`);
        }
        currentFrame.layers.push({
          id,
          name,
          visible: visibleStr === '1',
          locked: lockedStr === '1',
          pixels,
        });
      }
    }
  }

  if (currentFrame) {
    if (currentFrame.layers.length !== expectedLayerCount) {
      throw new Error(
        `Layer count mismatch for frame "${currentFrame.name}". Expected ${expectedLayerCount}, found ${currentFrame.layers.length}.`
      );
    }
    frames.push(currentFrame);
  }

  return { fps, frames };
}

/**
 * Exports animation data to a string in the .anim format.
 */
export async function exportAnimation(
  animation: { frames: Frame[]; fps: number },
  onProgress: (progress: ExportProgress) => void
): Promise<string> {
  const workers: Worker[] = [];
  const results: { [compositeId: string]: string } = {};

  // Flatten all layers from all frames to process them in parallel
  const allLayers = animation.frames.flatMap((frame) =>
    frame.layers.map((layer) => ({
      frameId: frame.id,
      layer,
    }))
  );

  try {
    const promises = allLayers.map(({ frameId, layer }) => {
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(workerURL);
        workers.push(worker);
        const compositeId = `${frameId}|${layer.id}`;

        worker.onmessage = (e: MessageEvent) => {
          const { type, layerId, progress, result, error } = e.data;
          if (type === 'progress') {
            onProgress({ layerId, progress });
          } else if (type === 'result') {
            results[layerId] = result;
            resolve();
          } else if (type === 'error') {
            reject(new Error(`Worker error for layer ${layerId}: ${error}`));
          }
        };

        worker.onerror = (error) => {
          reject(
            new Error(`Worker error for layer ${compositeId}: ${error.message}`)
          );
        };

        const pixelArray = [...layer.pixels.entries()].map(([key, color]) => {
          const [x, y] = key.split(',').map(Number);
          return [x, y, color];
        });

        worker.postMessage({
          action: 'encode',
          data: pixelArray,
          layerId: compositeId,
        });
      });
    });

    await Promise.all(promises);

    // Build the final .anim string
    const output: string[] = ['#ANIMATION', `FPS:${animation.fps}`];

    animation.frames.forEach((frame) => {
      output.push(
        '#FRAME',
        `ID:${frame.id}`,
        `NAME:${frame.name}`,
        `DURATION:${frame.duration}`,
        `ACTIVELAYER:${frame.activeLayerId}`,
        `#LAYERS:${frame.layers.length}`
      );
      frame.layers.forEach((layer) => {
        const compositeId = `${frame.id}|${layer.id}`;
        const visible = layer.visible ? '1' : '0';
        const locked = layer.locked ? '1' : '0';
        const pixels = results[compositeId] || '';
        output.push(`${layer.id};${layer.name};${visible};${locked};${pixels}`);
      });
    });

    return output.join('\n');
  } finally {
    workers.forEach((worker) => worker.terminate());
  }
}

/**
 * Imports animation data from a string.
 */
export async function importAnimation(
  data: string,
  onProgress: (progress: ImportProgress) => void
): Promise<{ frames: Frame[]; fps: number }> {
  const workers: Worker[] = [];
  const results: { [compositeId: string]: Map<string, number> } = {};

  try {
    const { fps, frames: parsedFrames } = validateAndParseAnimationData(data);

    const allLayersToDecode = parsedFrames.flatMap((frame) =>
      frame.layers.map((layer) => ({
        frameId: frame.id,
        layerData: layer,
      }))
    );

    const promises = allLayersToDecode.map(({ frameId, layerData }) => {
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(workerURL);
        workers.push(worker);
        const compositeId = `${frameId}|${layerData.id}`;

        worker.onmessage = (e: MessageEvent) => {
          const { type, layerId, progress, result, error } = e.data;
          if (type === 'progress') {
            onProgress({ layerId, progress });
          } else if (type === 'result') {
            try {
              const pixelArray = result as [number, number, number][];
              const pixels = new Map<string, number>();
              for (const [x, y, color] of pixelArray) {
                pixels.set(`${x},${y}`, color);
              }
              results[layerId] = pixels;
              resolve();
            } catch (err) {
              reject(
                new Error(
                  `Failed to process pixel data for layer ${layerId}: ${(err as Error).message}`
                )
              );
            }
          } else if (type === 'error') {
            reject(new Error(`Worker error for layer ${layerId}: ${error}`));
          }
        };

        worker.onerror = (error) => {
          reject(
            new Error(`Worker error for layer ${compositeId}: ${error.message}`)
          );
        };

        worker.postMessage({
          action: 'decode',
          data: layerData.pixels,
          layerId: compositeId,
        });
      });
    });

    await Promise.all(promises);

    // Reconstruct the Frame[] array
    const frames: Frame[] = parsedFrames.map((parsedFrame) => {
      const layers: Layer[] = parsedFrame.layers.map((parsedLayer) => {
        const compositeId = `${parsedFrame.id}|${parsedLayer.id}`;
        const pixels = results[compositeId];
        if (!pixels) {
          throw new Error(
            `Missing decoded pixel data for layer ${compositeId}`
          );
        }
        return {
          id: parsedLayer.id,
          name: parsedLayer.name,
          visible: parsedLayer.visible,
          locked: parsedLayer.locked,
          pixels,
        };
      });
      return {
        id: parsedFrame.id,
        name: parsedFrame.name,
        duration: parsedFrame.duration,
        activeLayerId: parsedFrame.activeLayerId,
        layers,
      };
    });

    return { frames, fps };
  } finally {
    workers.forEach((worker) => worker.terminate());
  }
}
