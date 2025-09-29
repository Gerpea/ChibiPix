import { Frame } from '@/features/animation/model/animationStore';
import { calculateFrameBounds } from './exportUtils';
import { intToHex } from '@/shared/utils/colors';

export interface RenderOptions {
  frame: Frame;
  pixelSize?: number;
  padding?: number;
  consistentSize?: boolean;
  maxDimensions?: { maxWidth: number; maxHeight: number } | null; // Required if consistentSize is true
  backgroundColor?: string | null; // null for transparent
  forceWhiteBackground?: boolean; // for JPG export
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Renders a single frame to a canvas element.
 */
export const renderFrameToCanvas = ({
  frame,
  pixelSize = 1,
  padding = 0,
  consistentSize = false,
  maxDimensions,
  backgroundColor = null,
  forceWhiteBackground = false,
}: RenderOptions): RenderResult => {
  const { minX, maxX, minY, maxY } = calculateFrameBounds(frame);
  const effectiveWidth = Math.max(1, maxX - minX + 1);
  const effectiveHeight = Math.max(1, maxY - minY + 1);

  const canvas = document.createElement('canvas');

  const canvasWidth = consistentSize
    ? maxDimensions!.maxWidth * pixelSize + padding * 2
    : effectiveWidth * pixelSize + padding * 2;

  const canvasHeight = consistentSize
    ? maxDimensions!.maxHeight * pixelSize + padding * 2
    : effectiveHeight * pixelSize + padding * 2;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d', {
    alpha: !forceWhiteBackground,
    willReadFrequently: true,
  })!;

  // Fill background
  if (forceWhiteBackground) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight); // Transparent
  }

  // Center + padding
  let offsetX = padding;
  let offsetY = padding;

  if (consistentSize && maxDimensions) {
    offsetX += ((maxDimensions.maxWidth - effectiveWidth) * pixelSize) / 2;
    offsetY += ((maxDimensions.maxHeight - effectiveHeight) * pixelSize) / 2;
  }

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

  return { canvas, ctx };
};
