import { useEffect, useRef } from 'react';
import { Layer } from '../model/animationStore';
import { intToHex } from '@/shared/utils/colors';

interface FramePreviewProps {
  frame: { id: string; name: string; layers: Layer[]; duration: number };
}

export const FramePreview: React.FC<FramePreviewProps> = ({ frame }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    const checkerSize = pixelSize * 4;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0
            ? '#fff'
            : '#ccc';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFactor, scaleFactor);

    frame.layers.forEach((layer) => {
      if (!layer.visible) return;
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        const adjustedX = (x - minX) * pixelSize;
        const adjustedY = (y - minY) * pixelSize;
        ctx.fillStyle = intToHex(color);
        ctx.fillRect(adjustedX, adjustedY, pixelSize + 0.1, pixelSize + 0.1);
      }
    });

    ctx.restore();
  }, [frame.layers]);

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} className="h-6 w-6 rounded-md" />
    </div>
  );
};
