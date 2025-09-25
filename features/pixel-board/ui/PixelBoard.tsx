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
import { useAIStore } from '@/features/ai-generation/models/aiStore';
import { Checkerboard, CheckerboardHandle } from './Checkerboard';
import { Minimap } from './Minimap';
import { PIXEL_SIZE } from '../const';
import { adjustColorOpacity, hexToInt, intToHex } from '@/shared/utils/colors';
import { useAnimationStore } from '@/features/animation/model/animationStore';

export const PixelBoard: React.FC = () => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { setLayerPixels, aiAreas } = useAnimationStore();

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
  const checkerboardRef = useRef<CheckerboardHandle>(null);

  // FIX: Use arrays instead of Maps for stable references across renders.
  const canvasRefs = useRef<HTMLCanvasElement[]>([]);
  const imageRefs = useRef<Konva.Image[]>([]);
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

  const layers = currentFrame?.layers ?? [];
  const activeLayerId = currentFrame?.activeLayerId ?? null;

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

  // FIX: Manage a stable pool of canvas elements based on layer count.
  useEffect(() => {
    const requiredCanvases = layers.length;
    canvasRefs.current.length = requiredCanvases;
    imageRefs.current.length = requiredCanvases;

    for (let i = 0; i < requiredCanvases; i++) {
      let canvas = canvasRefs.current[i];
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRefs.current[i] = canvas;
      }
      if (canvas.width !== stageWidth || canvas.height !== stageHeight) {
        canvas.width = stageWidth;
        canvas.height = stageHeight;
      }
    }
  }, [layers.length, stageWidth, stageHeight]);

  // Update pointer color
  useEffect(() => {
    pointerColor.current = hexToInt(primaryColor);
  }, [primaryColor]);

  // FIX: Redraw layers using indices for stable canvas access.
  const redrawLayers = useCallback(() => {
    checkerboardRef.current?.redraw();
    if (!stageRef.current) return;

    const minPixelX = Math.floor(panWorldX / PIXEL_SIZE);
    const minPixelY = Math.floor(panWorldY / PIXEL_SIZE);
    const maxPixelX = Math.ceil(
      (panWorldX + stageWidth / stageScale) / PIXEL_SIZE
    );
    const maxPixelY = Math.ceil(
      (panWorldY + stageHeight / stageScale) / PIXEL_SIZE
    );

    layers.forEach((layer, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (layer.visible) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.scale(stageScale, stageScale);
        ctx.translate(-panWorldX, -panWorldY);

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
                x * PIXEL_SIZE,
                y * PIXEL_SIZE,
                PIXEL_SIZE,
                PIXEL_SIZE
              );
            }
          }
        }
        ctx.restore();
      }

      const imageNode = imageRefs.current[index];
      if (imageNode) {
        imageNode.image(canvas);
      }
    });

    stageRef.current.batchDraw();
  }, [layers, stageWidth, stageHeight, panWorldX, panWorldY, stageScale]);

  // FIX: Add useEffect to trigger redraw whenever layers or transform changes.
  useEffect(() => {
    redrawLayers();
  }, [redrawLayers]);

  // Update stage size
  useEffect(() => {
    const updateSize = () => {
      if (!parentRef.current) return;
      const { width, height } = parentRef.current.getBoundingClientRect();
      setStageWidth(width);
      setStageHeight(height);
      // The canvas resizing is now handled in the canvas pool effect,
      // but we still need to trigger a redraw.
      redrawLayers();
    };

    const observer = new ResizeObserver(updateSize);
    if (parentRef.current) {
      observer.observe(parentRef.current);
    }
    return () => {
      if (parentRef.current) {
        observer.unobserve(parentRef.current);
      }
      observer.disconnect();
    };
  }, [redrawLayers]); // redrawLayers is the only dependency needed now

  // AI borders animation
  useEffect(() => {
    let anim: Konva.Animation | null = null;
    if (activeGenerations.length > 0) {
      const layer = stageRef.current
        ?.getLayers()
        .find((l) => l.hasName('aiLayer'));
      if (!layer) return;

      anim = new Konva.Animation((frame) => {
        if (frame) {
          aiBorderRefs.current.forEach((rect) => {
            rect.dashOffset(-(frame.time / 50) % 10);
          });
        }
      }, layer);
      anim.start();
    }
    return () => {
      anim?.stop();
    };
  }, [activeGenerations.length]);

  const flushPendingPixels = useCallback(() => {
    pendingPixels.current.forEach((pixels, layerId) => {
      if (pixels.length > 0) {
        setLayerPixels(layerId, pixels);
      }
    });
    pendingPixels.current.clear();
  }, [setLayerPixels]);

  // FIX: Update drawPixel to use the active layer's index.
  const drawPixel = (row: number, col: number, color: number) => {
    if (!layer || !layer.visible || !activeLayerId || layer.locked) return;

    const activeLayerIndex = layers.findIndex((l) => l.id === activeLayerId);
    if (activeLayerIndex === -1) return;

    const canvas = canvasRefs.current[activeLayerIndex];
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const getOpacity = () => {
      return currentTool === 'pencil' ||
        currentTool === 'eraser' ||
        currentTool === 'fill'
        ? toolSettings[currentTool].opacity
        : 100;
    };
    const getAdjustedColor = () => {
      return currentTool === 'eraser' ? 0 : adjustColorOpacity(color, opacity);
    };
    const getSize = () => {
      return currentTool === 'pencil' || currentTool === 'eraser'
        ? toolSettings[currentTool]?.size || 1
        : 1;
    };

    const opacity = getOpacity();
    const adjustedColor = getAdjustedColor();
    const size = getSize();
    const offset = Math.floor(size / 2);

    if (!pendingPixels.current.has(activeLayerId)) {
      pendingPixels.current.set(activeLayerId, []);
    }

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.scale(stageScale, stageScale);
    ctx.translate(-panWorldX, -panWorldY);

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

        const worldX = px * PIXEL_SIZE;
        const worldY = py * PIXEL_SIZE;
        const hexColor = intToHex(adjustedColor);
        const sizeWithBleed = PIXEL_SIZE;

        ctx.clearRect(worldX, worldY, sizeWithBleed, sizeWithBleed);

        if (adjustedColor !== 0) {
          ctx.fillStyle = hexColor;
          ctx.fillRect(worldX, worldY, sizeWithBleed, sizeWithBleed);
        }
      }
    }
    ctx.restore();
  };

  // ... (fillPixels and other handlers remain largely the same) ...
  const fillPixels = (startRow: number, startCol: number, color: number) => {
    if (!layer || !layer.visible || !activeLayerId || layer.locked) return;

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

    const maxPixels = 25000; // Safety break

    const newPixels: { x: number; y: number; color: number }[] = [];
    const stack: [number, number][] = [[startRow, startCol]];
    const visited = new Set<string>();
    visited.add(`${startCol},${startRow}`);

    let iterations = 0;

    while (stack.length > 0) {
      iterations++;
      if (iterations > maxPixels) break; // Safety break

      const [row, col] = stack.pop()!;

      const inAiArea = Object.values(aiAreas).some(
        (area) =>
          col >= area.startX &&
          col < area.startX + 16 &&
          row >= area.startY &&
          row < area.startY + 16
      );
      if (inAiArea) continue;

      const currentColor = pixels.get(`${col},${row}`) ?? 0;

      if (currentColor === targetColor) {
        newPixels.push({ x: col, y: row, color });

        const neighbors: [number, number][] = [
          [row + 1, col],
          [row - 1, col],
          [row, col + 1],
          [row, col - 1],
        ];

        for (const [nRow, nCol] of neighbors) {
          const key = `${nCol},${nRow}`;
          if (!visited.has(key)) {
            stack.push([nRow, nCol]);
            visited.add(key);
          }
        }
      }
    }

    if (newPixels.length > 0 && activeLayerId) {
      const existing = pendingPixels.current.get(activeLayerId) || [];
      pendingPixels.current.set(activeLayerId, [...existing, ...newPixels]);
    }
  };

  const getPointerPos = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return null;
    const worldX = pos.x / stageScale + panWorldX;
    const worldY = pos.y / stageScale + panWorldY;
    const col = Math.floor(worldX / PIXEL_SIZE);
    const row = Math.floor(worldY / PIXEL_SIZE);
    return { row, col };
  };

  const handlePaint = (row: number, col: number) => {
    if (!layer || !layer.visible || layer.locked) return;
    if (currentTool === 'pencil') {
      drawPixel(row, col, pointerColor.current);
    } else if (currentTool === 'eraser') {
      drawPixel(row, col, 0); // Color 0 is transparent
    } else if (currentTool === 'fill') {
      fillPixels(row, col, pointerColor.current);
    }
  };

  // ... (mouse handlers, context menu, wheel, cursor logic remains the same) ...

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (isPanning.current && currentTool === 'pan' && lastPanPos.current) {
      const currentPos = stage.getPointerPosition();
      if (currentPos) {
        const dx = (currentPos.x - lastPanPos.current.x) / stageScale;
        const dy = (currentPos.y - lastPanPos.current.y) / stageScale;
        setPanWorldX((prev) => prev - dx);
        setPanWorldY((prev) => prev - dy);
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
      pos &&
      (currentTool === 'pencil' || currentTool === 'eraser')
    ) {
      handlePaint(pos.row, pos.col);
    }
  };

  const handleMouseLeave = () => {
    setHoverPixel(null);
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1 || currentTool === 'pan') {
      // Middle mouse button pan
      isPanning.current = true;
      lastPanPos.current = stageRef.current?.getPointerPosition() || null;
      e.evt.preventDefault();
      return;
    }

    if (layer?.locked) return;

    isDrawing.current = true;
    pointerColor.current = hexToInt(
      e.evt.button === 2 ? secondaryColor : primaryColor
    );
    const pos = getPointerPos(e);
    if (pos) handlePaint(pos.row, pos.col);
    e.evt.preventDefault();
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
    isPanning.current = false;
    lastPanPos.current = null;
    flushPendingPixels();
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stageScale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.5, Math.min(newScale, 32));

    const newPanWorldX =
      panWorldX + pointer.x / oldScale - pointer.x / boundedScale;
    const newPanWorldY =
      panWorldY + pointer.y / oldScale - pointer.y / boundedScale;

    setStageScale(boundedScale);
    setPanWorldX(newPanWorldX);
    setPanWorldY(newPanWorldY);
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

  const stageStyle = useMemo(
    () => ({ cursor: getCursor() }),
    [layer, hoverPixel, aiAreas, currentTool, isPanning.current]
  );

  if (!currentFrame) {
    return (
      <div className="relative m-0 flex h-full w-full items-center justify-center p-0">
        <div className="text-gray-500">Loading Canvas...</div>
      </div>
    );
  }

  return (
    <div
      className="relative m-0 flex h-full max-h-full w-full max-w-full touch-none items-center justify-center overflow-hidden p-0"
      ref={parentRef}
    >
      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        style={stageStyle}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <Checkerboard
          stageWidth={stageWidth}
          stageHeight={stageHeight}
          panWorldX={panWorldX}
          panWorldY={panWorldY}
          stageScale={stageScale}
          ref={checkerboardRef}
        />

        {/* FIX: Use index as the key and for refs to prevent remounting */}
        {layers.map(
          (layer, index) =>
            layer.visible && (
              <Layer key={index} opacity={layer.opacity / 100}>
                <Image
                  ref={(node) => {
                    if (node) {
                      imageRefs.current[index] = node;
                    }
                  }}
                  image={canvasRefs.current[index]}
                  width={stageWidth}
                  height={stageHeight}
                  x={0}
                  y={0}
                  listening={false}
                />
              </Layer>
            )
        )}

        {hoverPixel &&
          (currentTool === 'pencil' || currentTool === 'eraser') &&
          !layer?.locked && (
            <Layer name="highlightLayer" listening={false}>
              {(() => {
                const size = toolSettings[currentTool]?.size || 1;
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
                        fill="rgba(255, 255, 255, 0.3)"
                        stroke="rgba(0, 0, 0, 0.5)"
                        strokeWidth={1}
                      />
                    );
                  }
                }
                return highlightRects;
              })()}
            </Layer>
          )}

        <Layer name="aiLayer">
          {activeGenerations.map((gen) => {
            if (!gen.area) return null;
            const { startX, startY } = gen.area;
            const x = (startX * PIXEL_SIZE - panWorldX) * stageScale;
            const y = (startY * PIXEL_SIZE - panWorldY) * stageScale;
            const width = 16 * PIXEL_SIZE * stageScale;
            const height = 16 * PIXEL_SIZE * stageScale;
            const latestThought =
              gen.thoughts[gen.thoughts.length - 1] || 'Generating...';

            return (
              <Group key={gen.id}>
                <Rect
                  ref={(node) => {
                    if (node) aiBorderRefs.current.set(gen.id, node);
                    else aiBorderRefs.current.delete(gen.id);
                  }}
                  x={x}
                  y={y}
                  width={width}
                  height={height}
                  stroke="blue"
                  strokeWidth={2}
                  dash={[5, 5]}
                  fill="rgba(0, 0, 255, 0.1)"
                />
                <Text
                  x={x}
                  y={y}
                  width={width}
                  height={height - 30}
                  text={latestThought}
                  fontSize={16}
                  align="center"
                  verticalAlign="middle"
                  wrap="word"
                  fill="white"
                />
                <Group
                  x={x + width - 30}
                  y={y + 10}
                  onClick={() => stopGeneration(gen.id)}
                  onTap={() => stopGeneration(gen.id)}
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
