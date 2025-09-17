import { Layer } from '@/features/layers/model/layerStore';

const workerURL = '/workers/serialization.js';

export interface ExportProgress {
  layerId: string;
  progress: number;
}

export interface ImportProgress {
  layerId: string;
  progress: number;
}

interface ImportLayerData {
  id: string;
  name: string;
  visible: boolean;
  pixels: string;
}

function validateImportData(data: string): ImportLayerData[] {
  const lines = data.trim().split('\n');
  if (lines.length < 1 || !lines[0].startsWith('#')) {
    throw new Error(
      'Invalid .layr format: Expected layer count header (e.g., #2)'
    );
  }

  const layerCount = parseInt(lines[0].slice(1));
  if (isNaN(layerCount) || layerCount !== lines.length - 1) {
    throw new Error('Invalid .layr format: Layer count mismatch');
  }

  const layers: ImportLayerData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const [id, name, visibleStr, pixels] = lines[i].split(';', 4);
    if (!id || !name || !visibleStr || pixels === undefined) {
      throw new Error(`Invalid .layr format: Malformed layer at line ${i + 1}`);
    }
    if (id.trim() === '') {
      throw new Error(
        `Invalid .layr format: Layer ID must be non-empty at line ${i + 1}`
      );
    }
    if (name.trim() === '') {
      throw new Error(
        `Invalid .layr format: Layer name must be non-empty at line ${i + 1}`
      );
    }
    if (visibleStr !== '0' && visibleStr !== '1') {
      throw new Error(
        `Invalid .layr format: Layer visible must be 0 or 1 at line ${i + 1}`
      );
    }
    layers.push({
      id,
      name,
      visible: visibleStr === '1',
      pixels,
    });
  }

  return layers;
}

export async function exportLayers(
  layers: Layer[],
  onProgress: (progress: ExportProgress) => void
): Promise<string> {
  const workers: Worker[] = [];
  const results: { [key: string]: string } = {};

  try {
    const promises = layers.map((layer) => {
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(workerURL);
        workers.push(worker);

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
            new Error(`Worker error for layer ${layer.id}: ${error.message}`)
          );
        };

        const pixelArray = [...layer.pixels.entries()].map(([key, color]) => {
          const [x, y] = key.split(',').map(Number);
          return [x, y, color];
        });

        worker.postMessage({
          action: 'encode',
          data: pixelArray,
          layerId: layer.id,
        });
      });
    });

    await Promise.all(promises);

    const lines = [`#${layers.length}`];
    layers.forEach((layer) => {
      const visible = layer.visible ? '1' : '0';
      lines.push(
        `${layer.id};${layer.name};${visible};${results[layer.id] || ''}`
      );
    });

    return lines.join('\n');
  } finally {
    workers.forEach((worker) => worker.terminate());
  }
}

export async function importLayers(
  data: string,
  onProgress: (progress: ImportProgress) => void
): Promise<Layer[]> {
  const workers: Worker[] = [];
  const results: { [key: string]: Map<string, number> } = {};

  try {
    const importData = validateImportData(data);

    const promises = importData.map((layerData) => {
      return new Promise<void>((resolve, reject) => {
        const worker = new Worker(workerURL);
        workers.push(worker);

        worker.onmessage = (e: MessageEvent) => {
          const { type, layerId, progress, result, error } = e.data;
          if (type === 'progress') {
            onProgress({ layerId, progress });
          } else if (type === 'result') {
            try {
              const pixelArray = result as [number, number, number][];
              if (!Array.isArray(pixelArray)) {
                reject(
                  new Error(`Invalid pixel data format for layer ${layerId}`)
                );
                return;
              }
              const pixels = new Map<string, number>();
              for (const [x, y, color] of pixelArray) {
                if (
                  typeof x !== 'number' ||
                  typeof y !== 'number' ||
                  typeof color !== 'number'
                ) {
                  reject(
                    new Error(
                      `Invalid pixel entry for layer ${layerId}: ${x},${y}:${color}`
                    )
                  );
                  return;
                }
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
            new Error(
              `Worker error for layer ${layerData.id}: ${error.message}`
            )
          );
        };

        worker.postMessage({
          action: 'decode',
          data: layerData.pixels,
          layerId: layerData.id,
        });
      });
    });

    await Promise.all(promises);

    return importData.map((layerData) => {
      const pixels = results[layerData.id];
      if (!pixels) {
        throw new Error(`No pixel data for layer ${layerData.id}`);
      }
      return {
        id: layerData.id,
        name: layerData.name,
        visible: layerData.visible,
        pixels,
      };
    });
  } finally {
    workers.forEach((worker) => worker.terminate());
  }
}
