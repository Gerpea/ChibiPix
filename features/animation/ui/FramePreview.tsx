'use client';

import { useEffect, useRef } from 'react';
import { intToHex } from '@/shared/utils/colors';
import { useTheme } from 'next-themes';
import { Layer } from '../model/types';

interface FramePreviewProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme(); // Hook to get the current theme

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previewSize = 48;
    const pixelSize = 2;
    const padding = 4;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      if (layer.pixels.size > 0) {
        for (const key of layer.pixels.keys()) {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    });

    // Handle frames with no pixels
    if (minX === Infinity) {
      minX = 0;
      maxX = 0;
      minY = 0;
      maxY = 0;
    }

    const effectiveWidth = Math.max(1, maxX - minX + 1);
    const effectiveHeight = Math.max(1, maxY - minY + 1);
    canvas.width = previewSize;
    canvas.height = previewSize;

    const contentWidth = effectiveWidth * pixelSize;
    const contentHeight = effectiveHeight * pixelSize;
    const scaleFactor = Math.min(
      (previewSize - 2 * padding) / contentWidth,
      (previewSize - 2 * padding) / contentHeight
    );
    const scaledWidth = contentWidth * scaleFactor;
    const scaledHeight = contentHeight * scaleFactor;
    const offsetX = (previewSize - scaledWidth) / 2;
    const offsetY = (previewSize - scaledHeight) / 2;

    // --- Theme-aware color changes start here ---

    const isDark = resolvedTheme === 'dark';

    // Same colors as the main canvas and other previews
    const color1 = isDark ? '#616161' : '#e0e0e0';
    const color2 = isDark ? '#424242' : '#c7c7c7';

    const checkerSize = pixelSize * 4;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0
            ? color1
            : color2;
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }
    // --- Theme-aware color changes end here ---

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        const adjustedX = (x - minX) * pixelSize;
        const adjustedY = (y - minY) * pixelSize;
        const hexColor = intToHex(color);
        if (hexColor !== 'transparent') {
          ctx.fillStyle = hexColor;
          ctx.fillRect(adjustedX, adjustedY, pixelSize + 0.1, pixelSize + 0.1);
        }
      }
    });

    ctx.restore();
    // Add resolvedTheme to the dependency array to trigger redraws on theme change
  }, [frame.layers, resolvedTheme]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas
        ref={canvasRef}
        className="border-border h-6 w-6 rounded-md border"
      />
    </div>
  );
};
