import React, { useEffect, useRef } from 'react';
import { Image, Layer } from 'react-konva';
import Konva from 'konva';
import { usePixelStore } from '../model/pixelStore';

export const Checkerboard: React.FC = () => {
  const { BOARD_WIDTH, BOARD_HEIGHT, PIXEL_SIZE } = usePixelStore();
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const imageRef = useRef<Konva.Image | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = BOARD_WIDTH * PIXEL_SIZE;
    canvas.height = BOARD_HEIGHT * PIXEL_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const checkerSize = PIXEL_SIZE;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (x / checkerSize + y / checkerSize) % 2 === 0 ? '#ffffff' : '#cecece';
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    if (imageRef.current) {
      imageRef.current.image(canvas);
      imageRef.current.getLayer()?.batchDraw();
      imageRef.current.getStage()?.batchDraw();
    }

    return () => {
      canvasRef.current = document.createElement('canvas');
    };
  }, [BOARD_WIDTH, BOARD_HEIGHT, PIXEL_SIZE]);

  return (
    <Layer listening={false}>
      <Image
        ref={imageRef}
        image={canvasRef.current}
        width={BOARD_WIDTH * PIXEL_SIZE}
        height={BOARD_HEIGHT * PIXEL_SIZE}
      />
    </Layer>
  );
};
