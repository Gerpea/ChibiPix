'use client';

import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Stage, Layer, Image, Rect } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { usePixelStore } from '../model/pixelStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore } from '@/features/layers/model/layerStore';
import { Checkerboard } from './Checkerboard';
import { Minimap } from './Minimap';

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
  const { PIXEL_SIZE } = usePixelStore();
  const { push } = useHistoryStore();
  const { primaryColor, secondaryColor, currentTool } = useToolbarStore();
  const [stageWidth, setStageWidth] = useState(32);
  const [stageHeight, setStageHeight] = useState(32);
  const [stageScale, setStageScale] = useState(1);
  const [panWorldX, setPanWorldX] = useState(0);
  const [panWorldY, setPanWorldY] = useState(0);

  const pointerColor = useRef(hexToInt(primaryColor));
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const imageRefs = useRef<Map<string, Konva.Image>>(new Map());
  const stageRef = useRef<Konva.Stage | null>(null);
  const parentRef = useRef<HTMLDivElement>(null);
  const pendingPixels = useRef<
    Map<string, { x: number; y: number; color: number }[]>
  >(new Map());
  const [worldBounds, setWorldBounds] = useState({
    minX: 0,
    minY: 0,
    maxX: 32,
    maxY: 32,
  });

  const layer = useMemo(
    () => layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );

  // Calculate world bounds
  useEffect(() => {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    layers.forEach((layer) => {
      if (layer.visible) {
        for (const [key] of layer.pixels.entries()) {
          const [x, y] = key.split(',').map(Number);
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x + 1);
          maxY = Math.max(maxY, y + 1);
        }
      }
    });
    if (minX === Infinity) {
      minX = 0;
      minY = 0;
      maxX = 32;
      maxY = 32;
    }
    setWorldBounds({ minX, minY, maxX, maxY });
  }, [layers]);

  // Initialize canvases
  useEffect(() => {
    layers.forEach((layer) => {
      if (!canvasRefs.current.get(layer.id)) {
        const canvas = document.createElement('canvas');
        canvas.width = stageWidth;
        canvas.height = stageHeight;
        canvasRefs.current.set(layer.id, canvas);
      }
    });
    const layerIds = new Set(layers.map((l) => l.id));
    for (const id of canvasRefs.current.keys()) {
      if (!layerIds.has(id)) {
        canvasRefs.current.delete(id);
      }
    }
  }, [layers, stageWidth, stageHeight]);

  // Update pointer color
  useEffect(() => {
    pointerColor.current = hexToInt(primaryColor);
  }, [primaryColor]);

  // Redraw main layers
  const redrawLayers = useCallback(() => {
    if (layers.length === 0) return;

    const minWorldX = panWorldX;
    const minWorldY = panWorldY;
    const maxWorldX = minWorldX + stageWidth / stageScale;
    const maxWorldY = minWorldY + stageHeight / stageScale;

    const minPixelX = Math.floor(minWorldX / PIXEL_SIZE);
    const minPixelY = Math.floor(minWorldY / PIXEL_SIZE);
    const maxPixelX = Math.ceil(maxWorldX / PIXEL_SIZE);
    const maxPixelY = Math.ceil(maxWorldY / PIXEL_SIZE);

    layers.forEach((layer) => {
      const canvas = canvasRefs.current.get(layer.id);
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

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
            const canvasX = (x * PIXEL_SIZE - minWorldX) * stageScale;
            const canvasY = (y * PIXEL_SIZE - minWorldY) * stageScale;
            ctx.fillStyle = hexColor;
            ctx.fillRect(
              canvasX,
              canvasY,
              PIXEL_SIZE * stageScale,
              PIXEL_SIZE * stageScale
            );
          }
        }
      }

      const imageNode = imageRefs.current.get(layer.id);
      if (imageNode && canvas) {
        imageNode.image(canvas);
        imageNode.getLayer()?.batchDraw();
      }
    });

    stageRef.current?.batchDraw();
  }, [
    layers,
    stageWidth,
    stageHeight,
    panWorldX,
    panWorldY,
    stageScale,
    PIXEL_SIZE,
  ]);

  // Update stage size
  useEffect(() => {
    const updateSize = () => {
      if (!parentRef.current) return;
      const { width, height } = parentRef.current.getBoundingClientRect();
      setStageWidth(width);
      setStageHeight(height);
      canvasRefs.current.forEach((canvas) => {
        canvas.width = width;
        canvas.height = height;
      });
      redrawLayers();
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (parentRef.current) {
      resizeObserver.observe(parentRef.current);
    }
    return () => {
      if (parentRef.current) {
        resizeObserver.unobserve(parentRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [redrawLayers]);

  useEffect(() => {
    redrawLayers();
  }, [redrawLayers]);

  // Draw a single pixel
  const drawPixel = (row: number, col: number, color: number) => {
    if (!layer || !layer.visible) return;
    console.log(
      `Drawing pixel at (${col}, ${row}) with color ${intToHex(color)} on layer ${activeLayerId}`
    );

    const canvas = canvasRefs.current.get(activeLayerId);
    const imageNode = imageRefs.current.get(activeLayerId);
    if (canvas && imageNode) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const canvasX = (col * PIXEL_SIZE - panWorldX) * stageScale;
        const canvasY = (row * PIXEL_SIZE - panWorldY) * stageScale;
        const pixelSizeScreen = PIXEL_SIZE * stageScale;

        ctx.fillStyle = intToHex(color);
        ctx.clearRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
        if (color !== 0) {
          ctx.fillRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
        }
        imageNode.image(canvas);
        imageNode.getLayer()?.batchDraw();
      }
    }

    if (!pendingPixels.current.has(activeLayerId)) {
      pendingPixels.current.set(activeLayerId, []);
    }
    pendingPixels.current.get(activeLayerId)!.push({ x: col, y: row, color });
  };

  // Flush pending pixel updates
  const flushPendingPixels = useCallback(() => {
    pendingPixels.current.forEach((pixels, layerId) => {
      if (pixels.length > 0) {
        setLayerPixels(layerId, pixels);
      }
    });
    pendingPixels.current.clear();
  }, [setLayerPixels]);

  // Flush pixels on mouse up
  useEffect(() => {
    const handleMouseUp = () => {
      flushPendingPixels();
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [flushPendingPixels]);

  // Fill pixels
  const fillPixels = (startRow: number, startCol: number, color: number) => {
    if (!layer || !layer.visible) return;
    const pixels = layer.pixels;
    const targetColor = pixels.get(`${startCol},${startRow}`) ?? 0;
    if (targetColor === color) return;

    const minPixelX = Math.floor(panWorldX / PIXEL_SIZE);
    const minPixelY = Math.floor(panWorldY / PIXEL_SIZE);
    const maxPixelX = Math.ceil(
      (panWorldX + stageWidth / stageScale) / PIXEL_SIZE
    );
    const maxPixelY = Math.ceil(
      (panWorldY + stageHeight / stageScale) / PIXEL_SIZE
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

    console.log(`Filling ${newPixels.length} pixels on layer ${activeLayerId}`);
    setLayerPixels(activeLayerId, newPixels);

    const canvas = canvasRefs.current.get(activeLayerId);
    const imageNode = imageRefs.current.get(activeLayerId);
    if (canvas && imageNode) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const pixelSizeScreen = PIXEL_SIZE * stageScale;
        newPixels.forEach(({ x, y, color }) => {
          const canvasX = (x * PIXEL_SIZE - panWorldX) * stageScale;
          const canvasY = (y * PIXEL_SIZE - panWorldY) * stageScale;
          ctx.fillStyle = intToHex(color);
          ctx.clearRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
          if (color !== 0) {
            ctx.fillRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
          }
        });
        imageNode.image(canvas);
        imageNode.getLayer()?.batchDraw();
      }
    }
  };

  // Handle mouse events
  const getPointerPos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!layer?.visible) return null;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return null;
    const worldX = panWorldX + pos.x / stageScale;
    const worldY = panWorldY + pos.y / stageScale;
    const col = Math.floor(worldX / PIXEL_SIZE);
    const row = Math.floor(worldY / PIXEL_SIZE);
    return { row, col };
  };

  const handlePaint = (row: number, col: number) => {
    if (currentTool === 'pencil') {
      drawPixel(row, col, pointerColor.current);
    } else if (currentTool === 'eraser') {
      drawPixel(row, col, 0);
    } else if (currentTool === 'fill') {
      fillPixels(row, col, pointerColor.current);
    }
  };

  const getCursor = () => {
    switch (currentTool) {
      case 'pencil':
        return 'crosshair';
      case 'eraser':
        return 'cell';
      case 'fill':
        return 'pointer';
      case 'pan':
        return isPanning.current ? 'grabbing' : 'grab';
      default:
        return 'crosshair';
    }
  };

  // Handle zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const scaleBy = 1.1;
    const oldScale = stageScale;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.5, Math.min(newScale, 3));

    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;

    const oldWorldX = panWorldX + pointer.x / oldScale;
    const oldWorldY = panWorldY + pointer.y / oldScale;
    const newPanWorldX = oldWorldX - pointer.x / boundedScale;
    const newPanWorldY = oldWorldY - pointer.y / boundedScale;

    setStageScale(boundedScale);
    setPanWorldX(newPanWorldX);
    setPanWorldY(newPanWorldY);
  };

  return (
    <div
      className="relative m-0 flex h-full max-h-full w-full max-w-full items-center justify-center p-0"
      ref={parentRef}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        className="absolute border-1 border-gray-950 bg-transparent"
        style={{ cursor: getCursor() }}
        onMouseDown={(e) => {
          if (currentTool === 'pan') {
            isPanning.current = true;
            lastPanPos.current = stageRef.current?.getPointerPosition() || null;
            e.evt.preventDefault();
            return;
          }
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
          const stage = stageRef.current;
          if (!stage) return;
          if (
            isPanning.current &&
            currentTool === 'pan' &&
            lastPanPos.current
          ) {
            const currentPos = stage.getPointerPosition();
            if (currentPos) {
              const deltaX = currentPos.x - lastPanPos.current.x;
              const deltaY = currentPos.y - lastPanPos.current.y;
              setPanWorldX((prev) => prev - deltaX / stageScale);
              setPanWorldY((prev) => prev - deltaY / stageScale);
              lastPanPos.current = currentPos;
            }
            return;
          }
          if (!isDrawing.current) return;
          if (currentTool !== 'pencil' && currentTool !== 'eraser') return;
          const pos = getPointerPos(e);
          if (pos) handlePaint(pos.row, pos.col);
        }}
        onMouseUp={() => {
          isDrawing.current = false;
          isPanning.current = false;
          lastPanPos.current = null;
          flushPendingPixels();
        }}
        onContextMenu={(e) => e.evt.preventDefault()}
        onWheel={handleWheel}
      >
        <Checkerboard
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          panWorldX={panWorldX}
          panWorldY={panWorldY}
          stageScale={stageScale}
        />
        {layers.map(
          (layer) =>
            layer.visible && (
              <Layer key={layer.id}>
                <Image
                  ref={(node) => {
                    if (node) {
                      imageRefs.current.set(layer.id, node);
                      const canvas = canvasRefs.current.get(layer.id);
                      if (canvas) {
                        node.image(canvas);
                        node.getLayer()?.batchDraw();
                      }
                    } else {
                      imageRefs.current.delete(layer.id);
                    }
                  }}
                  image={canvasRefs.current.get(layer.id)}
                  width={stageWidth}
                  height={stageHeight}
                  x={0}
                  y={0}
                />
                <Rect
                  x={0}
                  y={0}
                  width={stageWidth}
                  height={stageHeight}
                  listening={true}
                />
              </Layer>
            )
        )}
      </Stage>
      <Minimap
        layers={layers}
        stageWidth={stageWidth}
        stageHeight={stageHeight}
        stageScale={stageScale}
        panWorldX={panWorldX}
        panWorldY={panWorldY}
        worldBounds={worldBounds}
        setPanWorldX={setPanWorldX}
        setPanWorldY={setPanWorldY}
        pixelSize={PIXEL_SIZE}
      />
    </div>
  );
};
