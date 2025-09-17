interface WorkerMessage {
  action: 'encode' | 'decode';
  data: [number, number, number][] | string;
  layerId: string;
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
}

interface ResultMessage {
  type: 'result';
  layerId: string;
  result: string | [number, number, number][];
}

interface ErrorMessage {
  type: 'error';
  layerId: string;
  error: string;
}

type WorkerResponse = ProgressMessage | ResultMessage | ErrorMessage;

const encodeRLE = (pixels: [number, number, number][]): string => {
  if (!pixels.length) {
    self.postMessage({ type: 'progress', progress: 1 } as ProgressMessage);
    return '';
  }

  // Validate input pixels
  for (const [x, y, color] of pixels) {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !Number.isInteger(color)
    ) {
      self.postMessage({
        type: 'error',
        layerId: '',
        error: `Invalid pixel data: [${x},${y},${color}] must be integers`,
      } as ErrorMessage);
      return '';
    }
  }

  // Sort by y, then x to process row-wise for better grouping in blocks
  const sorted = pixels.sort((a, b) => {
    const [x1, y1, c1] = a;
    const [x2, y2, c2] = b;
    if (y1 !== y2) return y1 - y2; // Sort by row first
    if (x1 !== x2) return x1 - x2; // Then by column
    return c1 - c2; // Finally by color
  });

  const result: string[] = [];
  let count = 1;
  let [startX, startY, prevColor] = sorted[0];
  let prevX = startX;
  let prevY = startY;

  const total = sorted.length;
  let processed = 1;

  for (let i = 1; i < sorted.length; i++) {
    const [x, y, color] = sorted[i];

    // Check if the current pixel continues a run (same color, same row, consecutive x)
    if (color === prevColor && y === prevY && x === prevX + 1) {
      count++;
      prevX = x;
    } else {
      // End of a run, output the sequence
      if (count > 1) {
        result.push(`${startX},${startY},${prevColor}:${count}`);
      } else {
        result.push(`${startX},${startY},${prevColor}`);
      }
      startX = x;
      startY = y;
      prevX = x;
      prevY = y;
      prevColor = color;
      count = 1;
    }

    processed++;
    if (processed % 100 === 0 || processed === total) {
      self.postMessage({
        type: 'progress',
        progress: processed / total,
      } as ProgressMessage);
    }
  }

  // Push the final run
  if (count > 1) {
    result.push(`${startX},${startY},${prevColor}:${count}`);
  } else {
    result.push(`${startX},${startY},${prevColor}`);
  }

  self.postMessage({ type: 'progress', progress: 1 } as ProgressMessage);
  return result.join('|');
};

const decodeRLE = (rleString: string): [number, number, number][] => {
  if (!rleString) {
    self.postMessage({ type: 'progress', progress: 1 } as ProgressMessage);
    return [];
  }

  const entries = rleString.split('|').filter((entry) => entry);
  const pixels: [number, number, number][] = [];

  let processed = 0;
  const total = entries.length;

  for (const entry of entries) {
    const [coords, countStr] = entry.includes(':')
      ? entry.split(':')
      : [entry, '1'];
    if (!coords) {
      self.postMessage({
        type: 'error',
        layerId: '',
        error: `Invalid RLE entry format: ${entry}`,
      } as ErrorMessage);
      return pixels;
    }

    const [x, y, color] = coords.split(',').map(Number);
    const count = parseInt(countStr || '1');

    if (isNaN(x) || isNaN(y) || isNaN(color) || isNaN(count) || count < 1) {
      self.postMessage({
        type: 'error',
        layerId: '',
        error: `Invalid RLE entry: ${entry} (x, y, color, count must be valid numbers, count >= 1)`,
      } as ErrorMessage);
      return pixels;
    }

    // Generate pixels for the run
    for (let i = 0; i < count; i++) {
      pixels.push([x + i, y, color]);
    }

    processed++;
    if (processed % 100 === 0 || processed === total) {
      self.postMessage({
        type: 'progress',
        progress: processed / total,
      } as ProgressMessage);
    }
  }

  self.postMessage({ type: 'progress', progress: 1 } as ProgressMessage);
  return pixels;
};

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  try {
    const { action, data, layerId } = e.data;

    if (!action || !['encode', 'decode'].includes(action)) {
      self.postMessage({
        type: 'error',
        layerId,
        error: `Invalid action: ${action}`,
      } as ErrorMessage);
      return;
    }

    if (!layerId) {
      self.postMessage({
        type: 'error',
        layerId,
        error: 'Layer ID is required',
      } as ErrorMessage);
      return;
    }

    if (action === 'encode') {
      if (!Array.isArray(data)) {
        self.postMessage({
          type: 'error',
          layerId,
          error: 'Encode data must be an array of [x, y, color] tuples',
        } as ErrorMessage);
        return;
      }
      const encoded = encodeRLE(data as [number, number, number][]);
      self.postMessage({
        type: 'result',
        layerId,
        result: encoded,
      } as ResultMessage);
    } else if (action === 'decode') {
      if (typeof data !== 'string') {
        self.postMessage({
          type: 'error',
          layerId,
          error: 'Decode data must be a string',
        } as ErrorMessage);
        return;
      }
      const decoded = decodeRLE(data as string);
      self.postMessage({
        type: 'result',
        layerId,
        result: decoded,
      } as ResultMessage);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      layerId: e.data.layerId || '',
      error: (error as Error).message,
    } as ErrorMessage);
  }
};
