import { Layer } from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';

const PIXEL_SIZE = 1;
interface Frame {
  id: string;
  name: string;
  layers: Layer[];
  duration: number;
}

interface ExportOptions {
  frames: Frame[];
  padding?: number;
  consistentSize?: boolean;
  quality?: number;
  onProgress?: (progress: number) => void;
}

interface FrameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

// --- Calculate bounds for a single frame ---
const calculateFrameBounds = (frame: Frame): FrameBounds => {
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  frame.layers.forEach((layer) => {
    if (!layer.visible || layer.pixels.size === 0) return;
    for (const key of layer.pixels.keys()) {
      const [x, y] = key.split(',').map(Number);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });

  // If frame is empty, set default 8×8 area
  if (minX === Infinity || minY === Infinity) {
    minX = minY = 0;
    maxX = maxY = 7;
  }

  return { minX, maxX, minY, maxY };
};

// --- Find maximum dimensions across all frames ---
const findMaxDimensions = (
  frames: Frame[]
): { maxWidth: number; maxHeight: number } => {
  let maxWidth = 0;
  let maxHeight = 0;

  frames.forEach((frame) => {
    const { minX, maxX, minY, maxY } = calculateFrameBounds(frame);
    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);
    maxWidth = Math.max(maxWidth, effectiveWidth);
    maxHeight = Math.max(maxHeight, effectiveHeight);
  });

  return { maxWidth, maxHeight };
};

// --- Export multiple frames to JPGs with optional consistent size, quality, and progress callback ---
export const exportFramesToJPG = ({
  frames,
  padding = 0,
  consistentSize = false,
  quality = 0.8,
  onProgress,
}: ExportOptions): Promise<(Blob | null)[]> => {
  return new Promise(async (resolve) => {
    // Get max dimensions if consistent size is requested
    const maxDimensions = consistentSize ? findMaxDimensions(frames) : null;
    const canvasWidth = maxDimensions
      ? maxDimensions.maxWidth * PIXEL_SIZE + padding * 2
      : 0;
    const canvasHeight = maxDimensions
      ? maxDimensions.maxHeight * PIXEL_SIZE + padding * 2
      : 0;

    const blobs: (Blob | null)[] = [];
    const totalFrames = frames.length;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const blob = await new Promise<Blob | null>((resolveFrame) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolveFrame(null);
          return;
        }

        const { minX, maxX, minY, maxY } = calculateFrameBounds(frame);
        const effectiveWidth = Math.max(1, maxX - minX + 1);
        const effectiveHeight = Math.max(1, maxY - minY + 1);

        // Use max dimensions if consistentSize is true, otherwise use frame's own dimensions
        const finalCanvasWidth = consistentSize
          ? canvasWidth
          : effectiveWidth * PIXEL_SIZE + padding * 2;
        const finalCanvasHeight = consistentSize
          ? canvasHeight
          : effectiveHeight * PIXEL_SIZE + padding * 2;

        // Set canvas dimensions
        canvas.width = finalCanvasWidth;
        canvas.height = finalCanvasHeight;

        // Clear canvas with a white background for JPG (since JPG doesn't support transparency)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, finalCanvasWidth, finalCanvasHeight);

        // Draw pixels, centered if using consistent size
        ctx.save();
        // Apply padding and center the content
        let offsetX = padding;
        let offsetY = padding;

        if (consistentSize) {
          // Center the content if the frame is smaller than max dimensions
          offsetX +=
            ((maxDimensions!.maxWidth - effectiveWidth) * PIXEL_SIZE) / 2;
          offsetY +=
            ((maxDimensions!.maxHeight - effectiveHeight) * PIXEL_SIZE) / 2;
        }

        ctx.translate(offsetX, offsetY);

        frame.layers.forEach((layer) => {
          if (!layer.visible) return;
          for (const [key, color] of layer.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            const adjustedX = (x - minX) * PIXEL_SIZE;
            const adjustedY = (y - minY) * PIXEL_SIZE;

            ctx.fillStyle = intToHex(color);
            ctx.fillRect(adjustedX, adjustedY, PIXEL_SIZE, PIXEL_SIZE);
          }
        });

        ctx.restore();

        canvas.toBlob(
          (blob) => {
            resolveFrame(blob);
          },
          'image/jpeg',
          Math.max(0, Math.min(1, quality)) // Ensure quality is between 0 and 1
        );
      });

      blobs.push(blob);

      if (onProgress) {
        const progress = ((i + 1) / totalFrames) * 100;
        onProgress(progress);
      }
    }

    resolve(blobs);
  });
};
