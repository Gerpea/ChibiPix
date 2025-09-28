import GIFEncoder from 'gif-encoder-2';
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
  quality?: number;
  pixelSize?: number;
  backgroundColor?: string | null; // null for transparent
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

// --- Export frames to a single GIF with consistent size ---
export const exportFramesToGIF = ({
  frames,
  padding = 0,
  quality = 10,
  backgroundColor = null,
  pixelSize = PIXEL_SIZE,
  onProgress,
}: ExportOptions): Promise<Blob | null> => {
  return new Promise(async (resolve) => {
    if (frames.length === 0) {
      console.warn('No frames provided for GIF export');
      resolve(null);
      return;
    }

    // Always use consistent size for GIF to prevent jumping
    const { maxWidth, maxHeight } = findMaxDimensions(frames);
    const gifWidth = maxWidth * pixelSize + padding * 2;
    const gifHeight = maxHeight * pixelSize + padding * 2;

    try {
      const encoder = new GIFEncoder(gifWidth, gifHeight, 'neuquant', true); // Enable dithering for better color
      encoder.setQuality(quality);
      encoder.setRepeat(0); // 0 for infinite loop
      encoder.setTransparent(backgroundColor ? null : 0x000000); // Set transparent color if no backgroundColor
      encoder.start();

      const totalFrames = frames.length;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const canvas = document.createElement('canvas');
        canvas.width = gifWidth;
        canvas.height = gifHeight;
        const ctx = canvas.getContext('2d', {
          willReadFrequently: true,
          alpha: true,
        });
        if (!ctx) {
          console.error('Failed to get canvas 2D context for frame', i);
          resolve(null);
          return;
        }

        // Set background: transparent if backgroundColor is null, otherwise fill with color
        if (backgroundColor) {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, gifWidth, gifHeight);
        } else {
          ctx.clearRect(0, 0, gifWidth, gifHeight); // Ensure transparent background
        }

        // Draw pixels, centered
        const { minX, maxX, minY, maxY } = calculateFrameBounds(frame);
        const effectiveWidth = Math.max(1, maxX - minX + 1);
        const effectiveHeight = Math.max(1, maxY - minY + 1);

        const offsetX = padding + ((maxWidth - effectiveWidth) * pixelSize) / 2;
        const offsetY =
          padding + ((maxHeight - effectiveHeight) * pixelSize) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        frame.layers.forEach((layer) => {
          if (!layer.visible) return;
          for (const [key, color] of layer.pixels.entries()) {
            const [x, y] = key.split(',').map(Number);
            const adjustedX = (x - minX) * pixelSize;
            const adjustedY = (y - minY) * pixelSize;

            ctx.fillStyle = intToHex(color);
            ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
          }
        });

        ctx.restore();

        // Add frame to GIF encoder
        try {
          encoder.setDelay(frame.duration); // Set frame duration in ms
          encoder.addFrame(ctx);
        } catch (error) {
          console.error(`Failed to add frame ${i} to GIF:`, error);
          resolve(null);
          return;
        }

        // Call progress callback
        if (onProgress) {
          const progress = ((i + 1) / totalFrames) * 100;
          onProgress(progress);
        }
      }

      encoder.finish();
      const buffer = encoder.out.getData();
      if (!buffer || buffer.length === 0) {
        console.error('GIF encoder produced empty buffer');
        resolve(null);
        return;
      }
      const blob = new Blob([buffer], { type: 'image/gif' });
      resolve(blob);
    } catch (error) {
      console.error('GIF encoding error:', error);
      resolve(null);
    }
  });
};
