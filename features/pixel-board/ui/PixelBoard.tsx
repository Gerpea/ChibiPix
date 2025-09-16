'use client';

import React, { useRef, useMemo } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Checkerboard } from './Checkboard';
import { usePixelStore } from '../model/pixelStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore } from '@/features/layers/model/layerStore';

// Utility functions for color conversion
const hexToInt = (hex: string): number => {
  if (hex === 'transparent') return 0;
  const cleaned = hex.replace('#', '');
  return parseInt(cleaned + (cleaned.length === 6 ? 'FF' : ''), 16);
};

const intToHex = (color: number): string => {
  if (color === 0) return 'transparent';
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
};

export const PixelBoard: React.FC = () => {
  const { layers, setLayerPixels, activeLayerId } = useLayerStore();
  const { BOARD_HEIGHT, BOARD_WIDTH, PIXEL_SIZE } = usePixelStore();
  const { push } = useHistoryStore();
  const { primaryColor, secondaryColor, currentTool } = useToolbarStore();
  const pointerColor = useRef(hexToInt(primaryColor));
  const isDrawing = useRef(false);

  const layer = useMemo(
    () => layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );

  const drawPixel = (row: number, col: number, color: number) => {
    if (
      !layer ||
      row < 0 ||
      row >= layer.height ||
      col < 0 ||
      col >= layer.width
    )
      return;
    setLayerPixels(activeLayerId, [{ x: col, y: row, color }]);
  };

  const fillPixels = (startRow: number, startCol: number, color: number) => {
    if (
      !layer ||
      startRow < 0 ||
      startRow >= layer.height ||
      startCol < 0 ||
      startCol >= layer.width
    )
      return;
    const pixels = layer.pixels;
    const targetColor = pixels.get(`${startCol},${startRow}`) ?? 0;
    if (targetColor === color) return;

    const newPixels: { x: number; y: number; color: number }[] = [];
    const stack = [[startRow, startCol]];
    const visited = new Set<string>();

    while (stack.length) {
      const [row, col] = stack.pop()!;
      const key = `${col},${row}`;
      if (
        row < 0 ||
        col < 0 ||
        row >= layer.height ||
        col >= layer.width ||
        visited.has(key)
      )
        continue;

      const currentColor = pixels.get(key) ?? 0;
      if (currentColor !== targetColor) continue;

      visited.add(key);
      newPixels.push({ x: col, y: row, color });

      stack.push([row + 1, col]);
      stack.push([row - 1, col]);
      stack.push([row, col + 1]);
      stack.push([row, col - 1]);
    }

    setLayerPixels(activeLayerId, newPixels);
  };

  const handlePaint = (row: number, col: number) => {
    if (!layer?.visible) return;

    if (currentTool === 'pencil') {
      drawPixel(row, col, pointerColor.current);
    } else if (currentTool === 'eraser') {
      drawPixel(row, col, 0); // 0 represents transparent
    } else if (currentTool === 'fill') {
      fillPixels(row, col, pointerColor.current);
    }
  };

  const getPointerPos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!layer?.visible) return;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return null;
    const col = Math.floor(pos.x / PIXEL_SIZE);
    const row = Math.floor(pos.y / PIXEL_SIZE);
    if (row < 0 || row >= layer.height || col < 0 || col >= layer.width)
      return null;
    return { row, col };
  };

  // Map tool to cursor style
  const getCursor = () => {
    switch (currentTool) {
      case 'pencil':
        return 'crosshair';
      case 'eraser':
        return 'cell';
      case 'fill':
        return 'pointer';
      default:
        return 'crosshair';
    }
  };

  return (
    <Stage
      width={BOARD_WIDTH * PIXEL_SIZE}
      height={BOARD_HEIGHT * PIXEL_SIZE}
      style={{ border: '1px solid #333', cursor: getCursor() }}
      onMouseUp={() => {
        isDrawing.current = false;
      }}
      onContextMenu={(e) => e.evt.preventDefault()}
    >
      <Checkerboard />
      {layers.map(
        (layer) =>
          layer.visible && (
            <Layer key={`${layer.id}`}>
              {Array.from({ length: layer.height }, (_, y) =>
                Array.from({ length: layer.width }, (_, x) => {
                  const color = layer.pixels.get(`${x},${y}`) ?? 0;
                  return (
                    <Rect
                      key={`${layer.id}-${y}-${x}`}
                      x={x * PIXEL_SIZE}
                      y={y * PIXEL_SIZE}
                      width={PIXEL_SIZE}
                      height={PIXEL_SIZE}
                      fill={color === 0 ? undefined : intToHex(color)}
                      onMouseDown={(e) => {
                        push();
                        e.evt.preventDefault();
                        isDrawing.current = true;
                        pointerColor.current = hexToInt(
                          e.evt.button === 2 ? secondaryColor : primaryColor
                        );
                        const pos = getPointerPos(e);
                        if (pos) handlePaint(pos.row, pos.col);
                      }}
                      onMouseEnter={(e) => {
                        if (!isDrawing.current) return;
                        const pos = getPointerPos(e);
                        if (
                          pos &&
                          (currentTool === 'pencil' || currentTool === 'eraser')
                        )
                          handlePaint(pos.row, pos.col);
                      }}
                    />
                  );
                })
              )}
            </Layer>
          )
      )}
    </Stage>
  );
};
