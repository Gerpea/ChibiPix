import React, { useEffect, useRef } from 'react';
import { Image, Layer } from 'react-konva';
import Konva from 'konva';
import { usePixelStore } from '../model/pixelStore';

export const Checkerboard: React.FC<{
  stageWidth: number;
  stageHeight: number;
  panWorldX: number;
  panWorldY: number;
  stageScale: number;
}> = ({ stageWidth, stageHeight, panWorldX, panWorldY, stageScale }) => {
  const { PIXEL_SIZE } = usePixelStore();
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const imageRef = useRef<Konva.Image | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = stageWidth;
    canvas.height = stageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate visible world area
    const minWorldX = panWorldX;
    const minWorldY = panWorldY;
    const maxWorldX = minWorldX + stageWidth / stageScale;
    const maxWorldY = minWorldY + stageHeight / stageScale;

    // Start from the nearest lower multiple of PIXEL_SIZE
    const startX = Math.floor(minWorldX / PIXEL_SIZE) * PIXEL_SIZE;
    const startY = Math.floor(minWorldY / PIXEL_SIZE) * PIXEL_SIZE;
    const checkerSizeScreen = PIXEL_SIZE * stageScale;

    // Clear and draw checkerboard
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let currentWorldY = startY;
    while (currentWorldY < maxWorldY) {
      const canvasY = (currentWorldY - minWorldY) * stageScale;
      if (canvasY >= stageHeight) break;
      if (canvasY + checkerSizeScreen <= 0) {
        currentWorldY += PIXEL_SIZE;
        continue;
      }

      let currentWorldX = startX;
      while (currentWorldX < maxWorldX) {
        const canvasX = (currentWorldX - minWorldX) * stageScale;
        if (canvasX >= stageWidth) break;
        if (canvasX + checkerSizeScreen <= 0) {
          currentWorldX += PIXEL_SIZE;
          continue;
        }

        ctx.fillStyle =
          (Math.floor(currentWorldX / PIXEL_SIZE) +
            Math.floor(currentWorldY / PIXEL_SIZE)) %
            2 ===
          0
            ? '#ffffff'
            : '#cecece';
        ctx.fillRect(canvasX, canvasY, checkerSizeScreen, checkerSizeScreen);

        currentWorldX += PIXEL_SIZE;
      }
      currentWorldY += PIXEL_SIZE;
    }

    // Update Konva Image
    if (imageRef.current) {
      imageRef.current.image(canvas);
      imageRef.current.getLayer()?.batchDraw();
      imageRef.current.getStage()?.batchDraw();
    }

    return () => {
      canvasRef.current = document.createElement('canvas');
    };
  }, [stageWidth, stageHeight, panWorldX, panWorldY, stageScale, PIXEL_SIZE]);

  return (
    <Layer listening={false}>
      <Image
        ref={imageRef}
        image={canvasRef.current}
        width={stageWidth}
        height={stageHeight}
        x={0}
        y={0}
      />
    </Layer>
  );
};
