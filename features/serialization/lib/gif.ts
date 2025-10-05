import { Frame } from '@/features/animation/model/types';
import { findMaxDimensions } from './exportUtils';
import { renderFrameToCanvas } from './render';
import GIF from 'gif.js';

const PIXEL_SIZE = 1;

interface ExportOptions {
  frames: Frame[];
  padding?: number;
  quality?: number;
  pixelSize?: number;
  backgroundColor?: string | null;
  onProgress?: (progress: number) => void;
}

export const exportFramesToGIF = async ({
  frames,
  padding = 0,
  quality = 10,
  backgroundColor = null,
  pixelSize = PIXEL_SIZE,
  onProgress,
}: ExportOptions): Promise<Blob | null> => {
  if (frames.length === 0) {
    console.warn('No frames provided for GIF export');
    return null;
  }

  const { maxWidth, maxHeight } = findMaxDimensions(frames);
  const gifWidth = maxWidth * pixelSize + padding * 2;
  const gifHeight = maxHeight * pixelSize + padding * 2;

  try {
    const gif = new GIF({
      workers: 2,
      quality: quality,
      width: gifWidth,
      height: gifHeight,
      repeat: 0,
      transparent: backgroundColor ? null : '#000000',
      workerScript: '/workers/gif.js',
    });

    const totalFrames = frames.length;
    for (let i = 0; i < totalFrames; i++) {
      const frame = frames[i];
      const { ctx } = renderFrameToCanvas({
        frame,
        pixelSize,
        padding,
        consistentSize: true,
        maxDimensions: { maxHeight, maxWidth },
        backgroundColor,
      });

      const imageData = ctx.getImageData(0, 0, gifWidth, gifHeight);
      if (imageData.data.length === 0) {
        return null;
      }

      gif.addFrame(imageData, { delay: frame.duration });

      if (onProgress) {
        const progress = ((i + 1) / totalFrames) * 50;
        onProgress(progress);
      }

      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return new Promise((resolve) => {
      gif.on('progress', (p: number) => {
        if (onProgress) onProgress(50 + p * 50);
      });

      gif.on('finished', (blob: Blob) => {
        resolve(blob);
      });

      gif.render();
    });
  } catch (error) {
    console.error('GIF preparation error:', error);
    return null;
  }
};
