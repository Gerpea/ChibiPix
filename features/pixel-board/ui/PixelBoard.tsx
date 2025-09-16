'use client';

import React, { useRef, useMemo, useEffect } from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { usePixelStore } from '../model/pixelStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore } from '@/features/layers/model/layerStore';
import { Checkerboard } from './Checkerboard';

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
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageRefs = useRef<Map<string, Konva.Image>>(new Map());

  const layer = useMemo(
    () => layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );

  useEffect(() => {
    console.log(
      'Updating canvas buffers for layers:',
      layers.map((l) => ({
        id: l.id,
        pixelCount: l.pixels.size,
      }))
    );

    layers.forEach((layer) => {
      let canvas = canvasRefs.current.get(layer.id);
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRefs.current.set(layer.id, canvas);
      }
      canvas.width = layer.width * PIXEL_SIZE;
      canvas.height = layer.height * PIXEL_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      console.log(`Drawing ${layer.pixels.size} pixels for layer ${layer.id}`);
      for (const [key, color] of layer.pixels.entries()) {
        const [x, y] = key.split(',').map(Number);
        if (x >= 0 && x < layer.width && y >= 0 && y < layer.height) {
          const hexColor = intToHex(color);
          if (hexColor !== 'transparent') {
            ctx.fillStyle = hexColor;
            ctx.fillRect(
              x * PIXEL_SIZE,
              y * PIXEL_SIZE,
              PIXEL_SIZE,
              PIXEL_SIZE
            );
          }
        }
      }
    });

    layers.forEach((layer) => {
      const imageNode = imageRefs.current.get(layer.id);
      const canvas = canvasRefs.current.get(layer.id);
      if (imageNode && canvas) {
        imageNode.image(canvas);
        imageNode.getLayer()?.batchDraw();
      }
    });

    const layerIds = new Set(layers.map((l) => l.id));
    for (const id of canvasRefs.current.keys()) {
      if (!layerIds.has(id)) {
        console.log(`Cleaning up canvas for layer ${id}`);
        canvasRefs.current.delete(id);
      }
    }
    for (const id of imageRefs.current.keys()) {
      if (!layerIds.has(id)) {
        imageRefs.current.delete(id);
      }
    }
  }, [
    JSON.stringify(
      layers.map((l) => ({
        id: l.id,
        pixels: Array.from(l.pixels.entries()),
        width: l.width,
        height: l.height,
      }))
    ),
    PIXEL_SIZE,
  ]);

  useEffect(() => {
    pointerColor.current = hexToInt(primaryColor);
  }, [primaryColor]);

  const drawPixel = (row: number, col: number, color: number) => {
    if (
      !layer ||
      row < 0 ||
      row >= layer.height ||
      col < 0 ||
      col >= layer.width
    )
      return;
    console.log(
      `Drawing pixel at (${col}, ${row}) with color ${intToHex(color)} on layer ${activeLayerId}`
    );
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

    console.log(`Filling ${newPixels.length} pixels on layer ${activeLayerId}`);
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
              <Image
                ref={(node) => {
                  if (node) {
                    imageRefs.current.set(layer.id, node);
                  } else {
                    imageRefs.current.delete(layer.id);
                  }
                }}
                image={canvasRefs.current.get(layer.id)}
                width={layer.width * PIXEL_SIZE}
                height={layer.height * PIXEL_SIZE}
              />
              <Rect
                x={0}
                y={0}
                width={layer.width * PIXEL_SIZE}
                height={layer.height * PIXEL_SIZE}
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
                onMouseMove={(e) => {
                  if (!isDrawing.current) return;
                  const pos = getPointerPos(e);
                  if (
                    pos &&
                    (currentTool === 'pencil' || currentTool === 'eraser')
                  )
                    handlePaint(pos.row, pos.col);
                }}
              />
            </Layer>
          )
      )}
    </Stage>
  );
};
