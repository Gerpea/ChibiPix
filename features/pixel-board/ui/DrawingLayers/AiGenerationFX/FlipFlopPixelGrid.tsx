import React, { useEffect, useMemo, useRef } from 'react';
import Konva from 'konva';
import { Image as KonvaImage, Group } from 'react-konva';
import { usePixelBoardStore } from '@/features/pixel-board/model/pixelBoardStore';
import { PIXEL_SIZE } from '@/features/pixel-board/const';

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
  const { stage } = usePixelBoardStore();
  const imageRef = useRef<Konva.Image>(null);
  const flippedPixelsRef = useRef<
    { col: number; row: number; startTime: number }[]
  >([]);

  // Calculate the number of pixels based on scaled dimensions
  const cols = Math.max(1, Math.ceil(width / (PIXEL_SIZE * stage.scale)));
  const rows = Math.max(1, Math.ceil(height / (PIXEL_SIZE * stage.scale)));
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

    const anim = new Konva.Animation((frame) => {
      if (!frame) return;

      const time = frame.time / 1000;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, cols, rows);
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';

      const flipSpeed = 0.5;
      const maxFlips = Math.floor(total * 0.5);
      const flipDuration = 0.5;

      if (
        Math.random() < flipSpeed &&
        flippedPixelsRef.current.length < maxFlips
      ) {
        const index = Math.floor(Math.random() * total);
        const col = index % cols;
        const row = Math.floor(index / cols);
        flippedPixelsRef.current.push({ col, row, startTime: time });
      }

      for (let i = flippedPixelsRef.current.length - 1; i >= 0; i--) {
        const { col, row, startTime } = flippedPixelsRef.current[i];
        const elapsed = time - startTime;

        if (elapsed > flipDuration) {
          flippedPixelsRef.current.splice(i, 1);
          continue;
        }

        const alpha = Math.sin((elapsed / flipDuration) * Math.PI);
        ctx.fillStyle = `rgba(150, 150, 150, ${alpha})`;
        ctx.fillRect(col, row, 1, 1);
      }

      layer.batchDraw();
    }, layer);

    anim.start();
    return () => {
      anim.stop();
      flippedPixelsRef.current = [];
    };
  }, [cols, rows, total, offscreenCanvas, stage.scale]);

  return (
    <Group x={x} y={y}>
      <KonvaImage
        ref={imageRef}
        image={undefined}
        x={0}
        y={0}
        width={width / stage.scale}
        height={height / stage.scale}
        imageSmoothingEnabled={false}
        scaleX={stage.scale}
        scaleY={stage.scale}
      />
    </Group>
  );
};
