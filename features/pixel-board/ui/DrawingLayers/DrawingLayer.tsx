'use client';

import Konva from 'konva';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { Image as KonvaImage } from 'react-konva';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import {
  Tool,
  ToolSettings,
  useToolbarStore,
} from '@/features/toolbar/model/toolbarStore';
import { adjustColorOpacity, intToHex } from '@/shared/utils/colors';
import { PIXEL_SIZE } from '../../const';
import { usePixelBoardStore } from '../../model/pixelBoardStore';

interface DrawingLayerProps {
  id: string;
}

export type DrawingLayerHandle = {
  paint: (row: number, col: number, color: number) => void;
  flush: () => void;
};

function getOpacity(currentTool: Tool, toolSettings: ToolSettings) {
  return currentTool === 'pencil' ||
    currentTool === 'eraser' ||
    currentTool === 'fill'
    ? toolSettings[currentTool].opacity
    : 100;
}
function getAdjustedColor(currentTool: Tool, color: number, opacity: number) {
  return currentTool === 'eraser' ? 0 : adjustColorOpacity(color, opacity);
}
function getSize(currentTool: Tool, toolSettings: ToolSettings) {
  return currentTool === 'pencil' || currentTool === 'eraser'
    ? toolSettings[currentTool]?.size || 1
    : 1;
}

export const DrawingLayer = forwardRef<DrawingLayerHandle, DrawingLayerProps>(
  ({ id }, ref) => {
    const currentFrame = useAnimationStore(
      (state) => state.frames[state.currentFrameIndex]
    );
    const { stage, pan } = usePixelBoardStore();
    const { setLayerPixels } = useAnimationStore();
    const { currentTool, toolSettings } = useToolbarStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<Konva.Image>(null);
    const pendingPixels = useRef<{ x: number; y: number; color: number }[]>([]);

    const layers = useMemo(() => currentFrame?.layers ?? [], [currentFrame]);
    const layer = useMemo(() => layers.find((l) => l.id === id), [layers, id]);

    const redraw = useCallback(() => {
      if (!layer?.visible) return;

      const minPixelX = Math.floor(pan.x / PIXEL_SIZE);
      const minPixelY = Math.floor(pan.y / PIXEL_SIZE);
      const maxPixelX = Math.ceil(
        (pan.x + stage.width / stage.scale) / PIXEL_SIZE
      );
      const maxPixelY = Math.ceil(
        (pan.y + stage.height / stage.scale) / PIXEL_SIZE
      );

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';
      const snappedPanX = Math.floor(-pan.x * stage.scale);
      const snappedPanY = Math.floor(-pan.y * stage.scale);
      ctx.translate(snappedPanX, snappedPanY);

      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        if (
          x >= minPixelX &&
          x < maxPixelX &&
          y >= minPixelY &&
          y < maxPixelY
        ) {
          const hexColor = intToHex(color);
          if (hexColor !== 'transparent') {
            ctx.fillStyle = hexColor;
            ctx.fillRect(
              Math.floor(x * PIXEL_SIZE * stage.scale),
              Math.floor(y * PIXEL_SIZE * stage.scale),
              Math.ceil(PIXEL_SIZE * stage.scale),
              Math.ceil(PIXEL_SIZE * stage.scale)
            );
          }
        }
      }
      ctx.restore();

      const imageNode = imageRef.current;
      if (imageNode) {
        imageNode.image(canvas);
      }
      imageNode?.getStage()?.batchDraw();
    }, [stage, pan, layer]);

    useEffect(() => redraw(), [redraw]);
    const flushPendingPixels = useCallback(() => {
      setLayerPixels(id, pendingPixels.current);
      pendingPixels.current = [];
    }, [id, setLayerPixels]);

    const drawPixel = useCallback(
      (row: number, col: number, color: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
        const snappedPanX = Math.floor(-pan.x * stage.scale);
        const snappedPanY = Math.floor(-pan.y * stage.scale);
        ctx.translate(snappedPanX, snappedPanY);

        const opacity = getOpacity(currentTool, toolSettings);
        const adjustedColor = getAdjustedColor(currentTool, color, opacity);
        const size = getSize(currentTool, toolSettings);
        const offset = Math.floor(size / 2);

        for (let dy = -offset; dy < size - offset; dy++) {
          for (let dx = -offset; dx < size - offset; dx++) {
            const px = col + dx;
            const py = row + dy;

            pendingPixels.current.push({
              x: px,
              y: py,
              color: adjustedColor,
            });

            const hexColor = intToHex(adjustedColor);

            ctx.clearRect(
              Math.floor(px * PIXEL_SIZE * stage.scale),
              Math.floor(py * PIXEL_SIZE * stage.scale),
              Math.ceil(PIXEL_SIZE * stage.scale),
              Math.ceil(PIXEL_SIZE * stage.scale)
            );

            if (hexColor !== 'transparent') {
              ctx.fillStyle = hexColor;
              ctx.fillRect(
                Math.floor(px * PIXEL_SIZE * stage.scale),
                Math.floor(py * PIXEL_SIZE * stage.scale),
                Math.ceil(PIXEL_SIZE * stage.scale),
                Math.ceil(PIXEL_SIZE * stage.scale)
              );
              const imageNode = imageRef.current;
              if (imageNode) {
                imageNode.image(canvas);
              }
            }
          }
        }
        ctx.restore();
      },
      [id, currentTool, toolSettings, stage, pan]
    );

    const fillPixels = useCallback(
      (startRow: number, startCol: number, color: number) => {
        const pixels = layer?.pixels || new Map();
        const targetColor = pixels.get(`${startCol},${startRow}`) ?? 0;
        if (targetColor === color) return;

        const minPixelX = Math.floor(pan.x / PIXEL_SIZE);
        const minPixelY = Math.floor(pan.y / PIXEL_SIZE);
        const maxPixelX = Math.ceil(
          (pan.x + stage.width / stage.scale) / PIXEL_SIZE
        );
        const maxPixelY = Math.ceil(
          (pan.y + stage.height / stage.scale) / PIXEL_SIZE
        );

        const newPixels: { x: number; y: number; color: number }[] = [];
        const stack = [[startRow, startCol]];
        const visited = new Set<string>();

        while (stack.length) {
          const [row, col] = stack.pop()!;
          const key = `${col},${row}`;
          if (visited.has(key)) continue;

          if (
            col < minPixelX ||
            col >= maxPixelX ||
            row < minPixelY ||
            row >= maxPixelY
          ) {
            continue;
          }

          const currentColor = pixels.get(key) ?? 0;
          if (currentColor !== targetColor) continue;

          visited.add(key);
          newPixels.push({ x: col, y: row, color });

          stack.push([row + 1, col]);
          stack.push([row - 1, col]);
          stack.push([row, col + 1]);
          stack.push([row, col - 1]);
        }

        pendingPixels.current = newPixels;
        flushPendingPixels();
      },
      [id, layer, stage, pan, flushPendingPixels]
    );

    const handlePaint = useCallback(
      (row: number, col: number, color: number) => {
        if (currentTool === 'pencil') {
          drawPixel(row, col, color);
        } else if (currentTool === 'eraser') {
          drawPixel(row, col, 0);
        } else if (currentTool === 'fill') {
          fillPixels(row, col, color);
        }
      },
      [drawPixel, fillPixels, currentTool]
    );

    useEffect(() => {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }
      if (canvas.width !== stage.width || canvas.height !== stage.height) {
        canvas.width = stage.width;
        canvas.height = stage.height;
      }
      redraw();
    }, [id, stage.width, stage.height, currentFrame]);

    useImperativeHandle(
      ref,
      () => ({
        paint: handlePaint,
        flush: flushPendingPixels,
      }),
      [handlePaint, flushPendingPixels]
    );

    return (
      canvasRef.current &&
      layer &&
      layer.visible && (
        <KonvaImage
          ref={imageRef}
          image={canvasRef.current}
          width={stage.width}
          height={stage.height}
          x={0}
          y={0}
        />
      )
    );
  }
);

DrawingLayer.displayName = 'DrawingLayer';
