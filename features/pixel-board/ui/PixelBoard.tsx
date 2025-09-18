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

// Adjusts the alpha channel of a color integer based on opacity (0-100)
const adjustColorOpacity = (color: number, opacity: number): number => {
  if (color === 0) return 0; // Transparent stays transparent
  const normalizedOpacity = opacity / 100; // Convert to 0-1
  const r = (color >> 24) & 0xff;
  const g = (color >> 16) & 0xff;
  const b = (color >> 8) & 0xff;
  const a = Math.round(normalizedOpacity * 255); // New alpha
  return (r << 24) | (g << 16) | (b << 8) | a;
};

export const PixelBoard: React.FC = () => {
  const { layers, setLayerPixels, activeLayerId } = useLayerStore();
  const { PIXEL_SIZE } = usePixelStore();
  const { push } = useHistoryStore();
  const { primaryColor, secondaryColor, currentTool, toolSettings } =
    useToolbarStore();

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

  const [hoverPixel, setHoverPixel] = useState<{
    row: number;
    col: number;
  } | null>(null);

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
    const ResizeObserver = window.ResizeObserver;
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

  const drawPixel = (row: number, col: number, color: number) => {
    if (!layer || !layer.visible) return;

    const opacity =
      currentTool === 'pencil' ||
      currentTool === 'eraser' ||
      currentTool == 'fill'
        ? toolSettings[currentTool].opacity
        : 100;

    const adjustedColor =
      currentTool === 'eraser' ? 0 : adjustColorOpacity(color, opacity);

    const canvas = canvasRefs.current.get(activeLayerId);
    const imageNode = imageRefs.current.get(activeLayerId);

    const size =
      currentTool === 'pencil' || currentTool === 'eraser'
        ? toolSettings[currentTool]?.size || 1
        : 1;

    const offset = Math.floor(size / 2);

    if (canvas && imageNode) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        for (let dy = -offset; dy < size - offset; dy++) {
          for (let dx = -offset; dx < size - offset; dx++) {
            const canvasX = ((col + dx) * PIXEL_SIZE - panWorldX) * stageScale;
            const canvasY = ((row + dy) * PIXEL_SIZE - panWorldY) * stageScale;
            const pixelSizeScreen = PIXEL_SIZE * stageScale;

            ctx.fillStyle = intToHex(adjustedColor);
            ctx.clearRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
            if (adjustedColor !== 0) {
              ctx.fillRect(canvasX, canvasY, pixelSizeScreen, pixelSizeScreen);
            }
          }
        }
        imageNode.image(canvas);
        imageNode.getLayer()?.batchDraw();
      }
    }

    if (!pendingPixels.current.has(activeLayerId)) {
      pendingPixels.current.set(activeLayerId, []);
    }
    for (let dy = -offset; dy < size - offset; dy++) {
      for (let dx = -offset; dx < size - offset; dx++) {
        pendingPixels.current.get(activeLayerId)!.push({
          x: col + dx,
          y: row + dy,
          color: adjustedColor,
        });
      }
    }
  };

  const flushPendingPixels = useCallback(() => {
    pendingPixels.current.forEach((pixels, layerId) => {
      if (pixels.length > 0) {
        setLayerPixels(layerId, pixels);
      }
    });
    pendingPixels.current.clear();
  }, [setLayerPixels]);

  useEffect(() => {
    const handleMouseUp = () => {
      flushPendingPixels();
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [flushPendingPixels]);

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
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isPanning.current && currentTool === 'pan' && lastPanPos.current) {
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

    const pos = getPointerPos(e);
    if (pos && (currentTool === 'pencil' || currentTool == 'eraser')) {
      setHoverPixel(pos);
    } else {
      setHoverPixel(null);
    }

    if (
      isDrawing.current &&
      (currentTool === 'pencil' || currentTool === 'eraser')
    ) {
      if (pos) handlePaint(pos.row, pos.col);
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
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

        {/* Highlight preview for pencil tool */}
        {hoverPixel &&
          (currentTool === 'pencil' || currentTool === 'eraser') && (
            <Layer>
              {(() => {
                const size = toolSettings[currentTool].size || 1;
                const offset = Math.floor(size / 2);
                const highlightRects = [];
                for (let dy = -offset; dy < size - offset; dy++) {
                  for (let dx = -offset; dx < size - offset; dx++) {
                    const x =
                      ((hoverPixel.col + dx) * PIXEL_SIZE - panWorldX) *
                      stageScale;
                    const y =
                      ((hoverPixel.row + dy) * PIXEL_SIZE - panWorldY) *
                      stageScale;
                    highlightRects.push(
                      <Rect
                        key={`${dx},${dy}`}
                        x={x}
                        y={y}
                        width={PIXEL_SIZE * stageScale}
                        height={PIXEL_SIZE * stageScale}
                        fill="rgba(0, 0, 0, 0.3)"
                        stroke="gray"
                        strokeWidth={1}
                      />
                    );
                  }
                }
                return highlightRects;
              })()}
            </Layer>
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
