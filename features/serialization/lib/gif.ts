// @ts-expect-error will be fixed later
import GIFEncoder from 'gif-encoder-2';
import { Frame } from '@/features/animation/model/animationStore';
import { findMaxDimensions } from './exportUtils';
import { renderFrameToCanvas } from './render';

const PIXEL_SIZE = 1;

interface ExportOptions {
  frames: Frame[];
  padding?: number;
  quality?: number;
  pixelSize?: number;
  backgroundColor?: string | null; // null for transparent
  onProgress?: (progress: number) => void;
}

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
      const encoder = new GIFEncoder(gifWidth, gifHeight, 'neuquant', true);
      encoder.setQuality(quality);
      encoder.setRepeat(0);
      encoder.setTransparent(backgroundColor ? null : 0x000000);
      encoder.start();

      const totalFrames = frames.length;

      for (let i = 0; i < frames.length; i++) {
        const frame = frames[i];
        const { ctx } = renderFrameToCanvas({
          frame,
          pixelSize: pixelSize,
          padding,
          consistentSize: true,
          maxDimensions: { maxHeight, maxWidth },
          backgroundColor: backgroundColor,
        });

        try {
          encoder.setDelay(frame.duration);
          encoder.addFrame(ctx);
        } catch (error) {
          console.error(`Failed to add frame ${i} to GIF:`, error);
          resolve(null);
          return;
        }

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
