import { Frame } from '@/features/animation/model/animationStore';

export interface FrameBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const calculateFrameBounds = (frame: Frame): FrameBounds => {
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

export const findMaxDimensions = (
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
