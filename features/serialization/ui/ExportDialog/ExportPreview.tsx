import { useEffect, useRef, useState } from 'react';
import { intToHex } from '@/shared/utils/colors';
import { PIXEL_SIZE } from '@/features/pixel-board/const';
import { Layer } from '@/features/animation/model/types';

interface ExportPreviewProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  padding?: number;
  pixelSize?: number;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  frame,
  padding = 20,
  pixelSize = PIXEL_SIZE,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // --- Track parent container size dynamically ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || containerSize.width === 0 || containerSize.height === 0)
      return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    // --- Calculate bounds of all visible pixels ---
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

    // If frame is completely empty, set default 8×8 area
    if (minX === Infinity || minY === Infinity) {
      minX = minY = 0;
      maxX = maxY = 7;
    }

    // --- Content size before scaling ---
    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);

    const contentWidth = effectiveWidth * pixelSize;
    const contentHeight = effectiveHeight * pixelSize;

    // --- Add padding around content ---
    const paddedContentWidth = contentWidth + padding * 2;
    const paddedContentHeight = contentHeight + padding * 2;

    // --- Fit to container ---
    const canvasWidth = containerSize.width;
    const canvasHeight = containerSize.height;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const scale = Math.min(
      canvasWidth / paddedContentWidth,
      canvasHeight / paddedContentHeight
    );

    const scaledWidth = paddedContentWidth * scale;
    const scaledHeight = paddedContentHeight * scale;

    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;

    // --- Clear canvas before drawing ---
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // ==============================
    // DRAW FULL CANVAS CHECKERBOARD
    // ==============================
    const checkerSize = pixelSize * scale; // checker squares match scaled pixels
    const cols = Math.ceil(canvasWidth / checkerSize);
    const rows = Math.ceil(canvasHeight / checkerSize);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.fillStyle = (row + col) % 2 === 0 ? '#fff' : '#ccc';
        ctx.fillRect(
          col * checkerSize,
          row * checkerSize,
          checkerSize,
          checkerSize
        );
      }
    }

    // ==============================
    // DRAW PIXELS (CENTERED)
    // ==============================
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);

        // Position pixel relative to min bounds + padding
        const adjustedX = (x - minX) * pixelSize + padding;
        const adjustedY = (y - minY) * pixelSize + padding;

        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
      }
    });

    ctx.restore();
  }, [frame.layers, containerSize, padding, pixelSize]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col items-center"
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
