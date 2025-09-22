'use client';

import React, {
  useRef,
  useMemo,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { Stage, Layer, Image, Rect, Text, Group } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { usePixelStore } from '../model/pixelStore';
import { useHistoryStore } from '@/features/history/model/historyStore';
import { useLayerStore } from '@/features/layers/model/layerStore';
import { Checkerboard } from './Checkerboard';
import { Minimap } from './Minimap';
import { useAIStore } from '@/features/ai-generation/models/aiStore';

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
  const { layers, setLayerPixels, activeLayerId, aiAreas } = useLayerStore();
  const { PIXEL_SIZE } = usePixelStore();
  const { push } = useHistoryStore();
  const { primaryColor, secondaryColor, currentTool, toolSettings } =
    useToolbarStore();
  const { generations, stopGeneration } = useAIStore();

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
  const aiBorderRefs = useRef<Map<string, Konva.Rect>>(new Map());

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

  const activeGenerations = useMemo(
    () =>
      Object.values(generations).filter((gen) => gen.isGenerating && gen.area),
    [generations]
  );

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

  // AI borders animation
  useEffect(() => {
    let anim: Konva.Animation | null = null;
    if (activeGenerations.length > 0) {
      anim = new Konva.Animation((frame) => {
        if (frame) {
          aiBorderRefs.current.forEach((rect) => {
            rect.dashOffset(-(frame.time / 50) % 10);
          });
          stageRef.current?.batchDraw();
        }
      });
      anim.start();
    }
    return () => {
      if (anim) anim.stop();
    };
  }, [activeGenerations.length]);

  const drawPixel = (row: number, col: number, color: number) => {
    if (!layer || !layer.visible || layer.locked) return;

    const opacity =
      currentTool === 'pencil' ||
      currentTool === 'eraser' ||
      currentTool === 'fill'
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
            const px = col + dx;
            const py = row + dy;
            if (
              Object.values(aiAreas).some(
                (area) =>
                  px >= area.startX &&
                  px < area.startX + 16 &&
                  py >= area.startY &&
                  py < area.startY + 16
              )
            )
              continue;

            const canvasX = (px * PIXEL_SIZE - panWorldX) * stageScale;
            const canvasY = (py * PIXEL_SIZE - panWorldY) * stageScale;
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
        const px = col + dx;
        const py = row + dy;
        if (
          Object.values(aiAreas).some(
            (area) =>
              px >= area.startX &&
              px < area.startX + 16 &&
              py >= area.startY &&
              py < area.startY + 16
          )
        )
          continue;
        pendingPixels.current.get(activeLayerId)!.push({
          x: px,
          y: py,
          color: adjustedColor,
        });
      }
    }
  };

  // Fill pixels
  const fillPixels = (startRow: number, startCol: number, color: number) => {
    if (!layer || !layer.visible || layer.locked) return;
    if (
      Object.values(aiAreas).some(
        (area) =>
          startCol >= area.startX &&
          startCol < area.startX + 16 &&
          startRow >= area.startY &&
          startRow < area.startY + 16
      )
    )
      return;
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

      if (
        Object.values(aiAreas).some(
          (area) =>
            col >= area.startX &&
            col < area.startX + 16 &&
            row >= area.startY &&
            row < area.startY + 16
        )
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
    if (!layer?.visible || layer?.locked) return null;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return null;
    const worldX = panWorldX + pos.x / stageScale;
    const worldY = panWorldY + pos.y / stageScale;
    const col = Math.floor(worldX / PIXEL_SIZE);
    const row = Math.floor(worldY / PIXEL_SIZE);
    return { row, col };
  };

  const handlePaint = (row: number, col: number) => {
    if (!layer || !layer.visible || layer.locked) return;
    if (currentTool === 'pencil') {
      drawPixel(row, col, pointerColor.current);
    } else if (currentTool === 'eraser') {
      drawPixel(row, col, 0);
    } else if (currentTool === 'fill') {
      fillPixels(row, col, pointerColor.current);
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
    if (pos && (currentTool === 'pencil' || currentTool === 'eraser')) {
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
    if (
      layer?.locked &&
      (currentTool === 'pencil' ||
        currentTool === 'eraser' ||
        currentTool === 'fill')
    ) {
      return 'not-allowed';
    }
    if (
      (currentTool === 'pencil' ||
        currentTool === 'eraser' ||
        currentTool === 'fill') &&
      hoverPixel &&
      Object.values(aiAreas).some(
        (area) =>
          hoverPixel.col >= area.startX &&
          hoverPixel.col < area.startX + 16 &&
          hoverPixel.row >= area.startY &&
          hoverPixel.row < area.startY + 16
      )
    ) {
      return 'not-allowed';
    }
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
          if (layer?.locked) return; // Prevent drawing on locked layer
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
          (currentTool === 'pencil' || currentTool === 'eraser') &&
          !layer?.locked && (
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

        {/* AI generating areas visualization */}
        <Layer>
          {activeGenerations.map((gen) => {
            const area = gen.area!;
            const aiAreaWorldX = area.startX * PIXEL_SIZE;
            const aiAreaWorldY = area.startY * PIXEL_SIZE;
            const aiAreaWidth = 16 * PIXEL_SIZE;
            const aiAreaHeight = 16 * PIXEL_SIZE;

            const aiScreenX = (aiAreaWorldX - panWorldX) * stageScale;
            const aiScreenY = (aiAreaWorldY - panWorldY) * stageScale;
            const aiScreenWidth = aiAreaWidth * stageScale;
            const aiScreenHeight = aiAreaHeight * stageScale;

            const latestThought =
              gen.thoughts[gen.thoughts.length - 1] || 'Generating...';

            return (
              <Group key={gen.id}>
                <Rect
                  ref={(node) => {
                    if (node) {
                      aiBorderRefs.current.set(gen.id, node);
                    } else {
                      aiBorderRefs.current.delete(gen.id);
                    }
                  }}
                  x={aiScreenX}
                  y={aiScreenY}
                  width={aiScreenWidth}
                  height={aiScreenHeight}
                  stroke="blue"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="rgba(0, 0, 255, 0.1)"
                />
                <Text
                  x={aiScreenX}
                  y={aiScreenY}
                  width={aiScreenWidth}
                  height={aiScreenHeight - 30}
                  text={latestThought}
                  fontSize={16}
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  fill="black"
                />
                {/* Stop button in top-right corner */}
                <Group
                  x={aiScreenX + aiScreenWidth - 30}
                  y={aiScreenY + 10}
                  onClick={() => stopGeneration(gen.id)}
                  onTap={() => stopGeneration(gen.id)}
                  listening={true}
                >
                  <Rect width={20} height={20} fill="red" cornerRadius={4} />
                  <Text
                    text="✕"
                    fontSize={16}
                    fill="white"
                    align="center"
                    verticalAlign="middle"
                    width={20}
                    height={20}
                  />
                </Group>
              </Group>
            );
          })}
        </Layer>
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
