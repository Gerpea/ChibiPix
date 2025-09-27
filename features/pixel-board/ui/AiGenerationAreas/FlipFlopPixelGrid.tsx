import React, { useEffect, useMemo, useRef } from 'react';
import Konva from 'konva';
import { Image, Group } from 'react-konva';
import { PIXEL_SIZE } from '../../const';
import { usePixelBoardStore } from '../../model/pixelBoardStore';

interface FlipFlopPixelGridProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const FlipFlopPixelGrid: React.FC<FlipFlopPixelGridProps> = ({
  x,
  y,
  width,
  height,
}) => {
  const { scale } = usePixelBoardStore();
  const imageRef = useRef<Konva.Image>(null);

  // Calculate the number of pixels based on scaled dimensions
  const cols = Math.max(1, Math.ceil(width / (PIXEL_SIZE * scale)));
  const rows = Math.max(1, Math.ceil(height / (PIXEL_SIZE * scale)));
  const total = cols * rows;

  // Create off-screen canvas with scaled dimensions
  const offscreenCanvas = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    return canvas;
  }, [cols, rows]);

  useEffect(() => {
    const imageNode = imageRef.current;
    if (!imageNode) return;

    imageNode.image(offscreenCanvas);
    const layer = imageNode.getLayer();
    if (!layer) return;

    const ctx = offscreenCanvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';

    // --- Radial Pulse Animation ---
    const centerX = cols / 2;
    const centerY = rows / 2;

    // Find the furthest distance from the center to a corner
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;

      const time = frame.time / 1000; // time in seconds
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cols, rows);
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';

      for (let i = 0; i < total; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);

        const dx = col - centerX;
        const dy = row - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Create a wave that travels outwards from the center
        const pulse = Math.sin((distance / maxDist) * 35 - time * 2);
        const alpha = Math.pow(Math.max(0, pulse), 1.5);

        ctx.fillStyle = `rgba(130, 200, 255, ${alpha})`;
        ctx.fillRect(col, row, 1, 1);
      }
    }, layer);

    anim.start();
    return () => {
      anim.stop();
    };
  }, [cols, rows, total, offscreenCanvas, scale]);

  return (
    <Group x={x} y={y}>
      <Image
        ref={imageRef}
        x={0}
        y={0}
        width={width / scale}
        height={height / scale}
        imageSmoothingEnabled={false}
        scaleX={scale}
        scaleY={scale}
      />
    </Group>
  );
};
