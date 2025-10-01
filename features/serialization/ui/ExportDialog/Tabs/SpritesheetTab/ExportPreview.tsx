import { useRef, useEffect, useState } from 'react';
import { Layer } from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';
import { PIXEL_SIZE } from '@/features/pixel-board/const';
import { useTheme } from 'next-themes';

interface ExportPreviewProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
  padding?: number;
  pixelSize?: number;
  transparent?: boolean;
  showBounds?: boolean;
  consistentSize?: boolean;
  maxWidth?: number;
  maxHeight?: number;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({
  frame,
  padding = 20,
  pixelSize = PIXEL_SIZE,
  transparent = false,
  showBounds = false,
  consistentSize = false,
  maxWidth,
  maxHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { resolvedTheme } = useTheme();

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

    if (minX === Infinity || minY === Infinity) {
      minX = minY = 0;
      maxX = maxY = 7;
    }

    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);

    const innerW = consistentSize && maxWidth ? maxWidth : effectiveWidth;
    const innerH = consistentSize && maxHeight ? maxHeight : effectiveHeight;

    const contentWidth = effectiveWidth * pixelSize;
    const contentHeight = effectiveHeight * pixelSize;
    const innerWidth = innerW * pixelSize;
    const innerHeight = innerH * pixelSize;

    const paddedContentWidth = innerWidth + padding * 2;
    const paddedContentHeight = innerHeight + padding * 2;

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

    if (transparent) {
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    } else {
      const isDark = resolvedTheme === 'dark';
      const color1 = isDark ? '#616161' : '#e0e0e0';
      const color2 = isDark ? '#424242' : '#c7c7c7';
      const checkerSize = pixelSize * scale;
      const cols = Math.ceil(canvasWidth / checkerSize);
      const rows = Math.ceil(canvasHeight / checkerSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          ctx.fillStyle = (row + col) % 2 === 0 ? color1 : color2;
          ctx.fillRect(
            col * checkerSize,
            row * checkerSize,
            checkerSize,
            checkerSize
          );
        }
      }
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const contentOffsetX = consistentSize ? (innerWidth - contentWidth) / 2 : 0;
    const contentOffsetY = consistentSize
      ? (innerHeight - contentHeight) / 2
      : 0;

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);

        const adjustedX = (x - minX) * pixelSize + padding + contentOffsetX;
        const adjustedY = (y - minY) * pixelSize + padding + contentOffsetY;

        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize, pixelSize);
      }
    });

    ctx.restore();
  }, [
    frame.layers,
    containerSize,
    padding,
    pixelSize,
    transparent,
    consistentSize,
    maxWidth,
    maxHeight,
    resolvedTheme,
  ]);

  return (
    <div
      ref={containerRef}
      className={`flex h-full w-full flex-col items-center ${showBounds ? 'border border-dashed border-black dark:border-gray-400' : ''}`}
    >
      <canvas ref={canvasRef} className="block" />
    </div>
  );
};
