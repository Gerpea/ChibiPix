import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { Image, Layer } from 'react-konva';
import Konva from 'konva';
import { PIXEL_SIZE } from '../const';
import { usePixelBoardStore } from '../model/pixelBoardStore';

type DrawCheckboardOptions = {
  startY: number;
  startX: number;
  maxWorldY: number;
  minWorldY: number;
  maxWorldX: number;
  minWorldX: number;
  stageScale: number;
  stageHeight: number;
  stageWidth: number;
  checkerSizeScreen: number;
};

function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  {
    startY,
    startX,
    maxWorldY,
    minWorldY,
    maxWorldX,
    minWorldX,
    stageScale,
    stageHeight,
    stageWidth,
    checkerSizeScreen,
  }: DrawCheckboardOptions
) {
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
      ctx.fillRect(
        Math.floor(canvasX),
        Math.floor(canvasY),
        Math.ceil(checkerSizeScreen),
        Math.ceil(checkerSizeScreen)
      );

      currentWorldX += PIXEL_SIZE;
    }
    currentWorldY += PIXEL_SIZE;
  }
}

export type CheckerboardHandle = {
  redraw: () => void;
};

export const Checkerboard = forwardRef<CheckerboardHandle>((_, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const imageRef = useRef<Konva.Image | null>(null);
  const { stage, pan } = usePixelBoardStore();

  const propsRef = useRef({
    stageWidth: stage.width,
    stageHeight: stage.height,
    panWorldX: pan.x,
    panWorldY: pan.y,
    stageScale: stage.scale,
  });
  useEffect(() => {
    propsRef.current = {
      stageWidth: stage.width,
      stageHeight: stage.height,
      panWorldX: pan.x,
      panWorldY: pan.y,
      stageScale: stage.scale,
    };
  }, [stage, pan]);

  const redraw = useCallback(() => {
    const { stageWidth, stageHeight, panWorldX, panWorldY, stageScale } =
      propsRef.current;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.imageSmoothingQuality = 'low';

    if (canvas.width !== stageWidth || canvas.height !== stageHeight) {
      canvas.width = stageWidth;
      canvas.height = stageHeight;
    }

    const minWorldX = panWorldX;
    const minWorldY = panWorldY;
    const maxWorldX = minWorldX + stageWidth / stageScale;
    const maxWorldY = minWorldY + stageHeight / stageScale;

    const startX = Math.floor(minWorldX / PIXEL_SIZE) * PIXEL_SIZE;
    const startY = Math.floor(minWorldY / PIXEL_SIZE) * PIXEL_SIZE;
    const checkerSizeScreen = Math.ceil(PIXEL_SIZE * stageScale);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCheckerboard(ctx, {
      checkerSizeScreen,
      maxWorldX,
      maxWorldY,
      minWorldX,
      minWorldY,
      stageHeight,
      stageScale,
      stageWidth,
      startX,
      startY,
    });

    if (imageRef.current) {
      imageRef.current.image(canvas);
      imageRef.current.getLayer()?.batchDraw();
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      redraw: redraw,
    }),
    [redraw]
  );

  useEffect(() => {
    redraw();
  }, [redraw]);

  return (
    <Layer listening={false}>
      <Image
        ref={imageRef}
        image={canvasRef.current}
        width={stage.width}
        height={stage.height}
        x={0}
        y={0}
      />
    </Layer>
  );
});

Checkerboard.displayName = 'Checkerboard';
