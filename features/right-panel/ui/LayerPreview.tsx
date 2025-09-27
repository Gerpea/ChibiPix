import { useEffect, useRef } from 'react';
import { Layer } from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';

interface LayerPreviewProps {
  layer: Layer;
}
export const LayerPreview: React.FC<LayerPreviewProps> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixelSize = 2;
    const padding = 4;
    const previewSize = 48;

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    if (layer.pixels.size > 0) {
      for (const key of layer.pixels.keys()) {
        const [x, y] = key.split(',').map(Number);
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    } else {
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
    const scale = Math.min(
      (previewSize - 2 * padding) / contentWidth,
      (previewSize - 2 * padding) / contentHeight
    );

    const scaledWidth = contentWidth * scale;
    const scaledHeight = contentHeight * scale;
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
    ctx.scale(scale, scale);

    for (const [key, color] of layer.pixels.entries()) {
      const [x, y] = key.split(',').map(Number);
      const adjustedX = (x - minX) * pixelSize;
      const adjustedY = (y - minY) * pixelSize;
      ctx.fillStyle = intToHex(color);
      ctx.fillRect(adjustedX, adjustedY, pixelSize + 0.1, pixelSize + 0.1);
    }

    ctx.restore();
  }, [layer.pixels]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className={`h-8 w-8 rounded-md`} />
    </div>
  );
};
