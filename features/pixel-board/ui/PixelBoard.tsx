'use client';

import React, { useRef } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Checkerboard } from './Checkboard';
import { usePixelStore } from '../model/pixelStore';
import { useHistoryStore } from '@/features/history/model/historyStore';

export const PixelBoard: React.FC = () => {
  const { BOARD_WIDTH, BOARD_HEIGHT, PIXEL_SIZE, pixels, setPixels } =
    usePixelStore();
  const { push } = useHistoryStore();

  const { primaryColor, secondaryColor, currentTool } = useToolbarStore();
  const pointerColor = useRef(primaryColor);
  const isDrawing = useRef(false);

  const drawPixel = (row: number, col: number, color: string) => {
    const newPixels = pixels.map((arr) => arr.slice());
    newPixels[row][col] = color;
    setPixels(newPixels);
  };

  const fillPixels = (startRow: number, startCol: number, color: string) => {
    const targetColor = pixels[startRow][startCol];
    if (targetColor === color) return;

    const newPixels = pixels.map((row) => row.slice());
    const stack = [[startRow, startCol]];

    while (stack.length) {
      const [row, col] = stack.pop()!;
      if (
        row < 0 ||
        col < 0 ||
        row >= BOARD_HEIGHT ||
        col >= BOARD_WIDTH ||
        newPixels[row][col] !== targetColor
      )
        continue;

      newPixels[row][col] = color;

      stack.push([row + 1, col]);
      stack.push([row - 1, col]);
      stack.push([row, col + 1]);
      stack.push([row, col - 1]);
    }

    setPixels(newPixels);
  };

  const handlePaint = (row: number, col: number) => {
    if (currentTool === 'pencil') {
      drawPixel(row, col, pointerColor.current);
    } else if (currentTool === 'eraser') {
      drawPixel(row, col, 'transparent');
    } else if (currentTool === 'fill') {
      fillPixels(row, col, pointerColor.current);
    }
  };

  const getPointerPos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return null;
    const col = Math.floor(pos.x / PIXEL_SIZE);
    const row = Math.floor(pos.y / PIXEL_SIZE);
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
      <Layer>
        {pixels.map((rowArr, row) =>
          rowArr.map((color, col) => (
            <Rect
              key={`${row}-${col}`}
              x={col * PIXEL_SIZE}
              y={row * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={color === 'transparent' ? undefined : color}
              stroke="#ccc"
              onMouseDown={(e) => {
                push(pixels);
                e.evt.preventDefault();
                isDrawing.current = true;
                pointerColor.current =
                  e.evt.button === 2 ? secondaryColor : primaryColor;
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
          ))
        )}
      </Layer>
    </Stage>
  );
};
