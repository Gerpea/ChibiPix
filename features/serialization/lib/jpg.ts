import { Frame } from '@/features/animation/model/types';
import { findMaxDimensions } from './exportUtils';
import { renderFrameToCanvas } from './render';

const PIXEL_SIZE = 1;

interface ExportOptions {
  frames: Frame[];
  padding?: number;
  consistentSize?: boolean;
  quality?: number;
  onProgress?: (progress: number) => void;
}

export const exportFramesToJPG = ({
  frames,
  padding = 0,
  consistentSize = false,
  quality = 0.8,
  onProgress,
}: ExportOptions): Promise<(Blob | null)[]> => {
  return new Promise(async (resolve) => {
    const maxDimensions = consistentSize ? findMaxDimensions(frames) : null;
    const blobs: (Blob | null)[] = [];
    const totalFrames = frames.length;

    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const blob = await new Promise<Blob | null>((resolveFrame) => {
        const { canvas } = renderFrameToCanvas({
          frame,
          pixelSize: PIXEL_SIZE,
          padding,
          consistentSize,
          maxDimensions,
          backgroundColor: '#FFFFFF',
          forceWhiteBackground: true,
        });

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
