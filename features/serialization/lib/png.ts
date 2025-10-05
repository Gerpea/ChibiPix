import { Frame } from '@/features/animation/model/types';
import { findMaxDimensions } from './exportUtils';
import { renderFrameToCanvas } from './render';

const PIXEL_SIZE = 1;

interface ExportOptions {
  frames: Frame[];
  padding?: number;
  consistentSize?: boolean;
  onProgress?: (progress: number) => void;
}

export const exportFramesToPNG = ({
  frames,
  padding = 0,
  consistentSize = false,
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
        });

        canvas.toBlob(
          (blob) => {
            resolveFrame(blob);
          },
          'image/png',
          1.0
        );
      });

      blobs.push(blob);

      // Call progress callback with percentage (0 to 100)
      if (onProgress) {
        const progress = ((i + 1) / totalFrames) * 100;
        onProgress(progress);
      }
    }

    resolve(blobs);
  });
};
