import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { Layer } from '@/features/layers/model/layerStore';

const MINIMAP_SIZE = 150;

const intToHex = (color: number): string => {
  if (color === 0) return 'transparent';
  return `#${(color >>> 0).toString(16).padStart(8, '0')}`;
};

interface MinimapProps {
  layers: Layer[];
  stageWidth: number;
  stageHeight: number;
  stageScale: number;
  panWorldX: number;
  panWorldY: number;
  worldBounds: { minX: number; minY: number; maxX: number; maxY: number };
  setPanWorldX: (x: number) => void;
  setPanWorldY: (y: number) => void;
  pixelSize: number;
}

export const Minimap: React.FC<MinimapProps> = ({
  layers,
  stageWidth,
  stageHeight,
  stageScale,
  panWorldX,
  panWorldY,
  worldBounds,
  setPanWorldX,
  setPanWorldY,
  pixelSize,
}) => {
  const minimapStageRef = useRef<Konva.Stage | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const isDragging = useRef(false);
  const redrawRequested = useRef(false);

  // Initialize canvas
  useEffect(() => {
    if (!minimapCanvasRef.current) {
      minimapCanvasRef.current = document.createElement('canvas');
      const dpr = window.devicePixelRatio || 1;
      minimapCanvasRef.current.width = MINIMAP_SIZE * dpr;
      minimapCanvasRef.current.height = MINIMAP_SIZE * dpr;
      minimapCanvasRef.current.style.width = `${MINIMAP_SIZE}px`;
      minimapCanvasRef.current.style.height = `${MINIMAP_SIZE}px`;
      const ctx = minimapCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = false;
      }
    }
    setIsCanvasReady(true);
  }, []);

  // Debounced redraw function
  const redrawMinimap = useCallback(() => {
    if (!minimapCanvasRef.current || !minimapStageRef.current) return;
    if (redrawRequested.current) return;
    redrawRequested.current = true;

    requestAnimationFrame(() => {
      const ctx = minimapCanvasRef.current!.getContext('2d');
      if (!ctx) {
        redrawRequested.current = false;
        return;
      }

      // Compute effective bounds
      const viewWidth = stageWidth / stageScale;
      const viewHeight = stageHeight / stageScale;
      const effectiveMinX = Math.min(
        worldBounds.minX,
        Math.floor(panWorldX / pixelSize)
      );
      const effectiveMinY = Math.min(
        worldBounds.minY,
        Math.floor(panWorldY / pixelSize)
      );
      const effectiveMaxX = Math.max(
        worldBounds.maxX,
        Math.ceil((panWorldX + viewWidth) / pixelSize)
      );
      const effectiveMaxY = Math.max(
        worldBounds.maxY,
        Math.ceil((panWorldY + viewHeight) / pixelSize)
      );

      const worldWidth = effectiveMaxX - effectiveMinX;
      const worldHeight = effectiveMaxY - effectiveMinY;

      const scale = Math.min(
        MINIMAP_SIZE / (worldWidth * pixelSize),
        MINIMAP_SIZE / (worldHeight * pixelSize)
      );

      const drawnWidth = worldWidth * pixelSize * scale;
      const drawnHeight = worldHeight * pixelSize * scale;
      const offsetMinimapX = (MINIMAP_SIZE - drawnWidth) / 2;
      const offsetMinimapY = (MINIMAP_SIZE - drawnHeight) / 2;

      // Clear canvas
      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      ctx.save();
      ctx.translate(offsetMinimapX, offsetMinimapY);

      // Clip with padding for stroke overflow
      const lineWidth = 2;
      const halfLineWidth = lineWidth / 2;
      ctx.beginPath();
      ctx.rect(
        -halfLineWidth,
        -halfLineWidth,
        drawnWidth + lineWidth,
        drawnHeight + lineWidth
      );
      ctx.clip();

      // Draw pixels
      const pixelSizeScaled = pixelSize * scale;
      layers.forEach((layer) => {
        if (!layer.visible) return;
        for (const [key, color] of layer.pixels.entries()) {
          const [x, y] = key.split(',').map(Number);
          const hexColor = intToHex(color);
          if (hexColor !== 'transparent') {
            const canvasX = (x - effectiveMinX) * pixelSize * scale;
            const canvasY = (y - effectiveMinY) * pixelSize * scale;
            ctx.fillStyle = hexColor;
            ctx.fillRect(canvasX, canvasY, pixelSizeScaled, pixelSizeScaled);
          }
        }
      });

      // Draw viewport rectangle
      const viewX = (panWorldX - effectiveMinX * pixelSize) * scale;
      const viewY = (panWorldY - effectiveMinY * pixelSize) * scale;
      const viewWidthScaled = viewWidth * scale;
      const viewHeightScaled = viewHeight * scale;

      // Clamp viewport to content bounds
      const clampedViewX = Math.max(
        0,
        Math.min(viewX, drawnWidth - viewWidthScaled)
      );
      const clampedViewY = Math.max(
        0,
        Math.min(viewY, drawnHeight - viewHeightScaled)
      );

      // Rounded rectangle parameters
      const borderRadius = 6; // Adjust for more/less rounding

      ctx.strokeStyle = '#6B7280'; // Tailwind gray-500 color
      ctx.lineWidth = lineWidth;

      // Function to draw rounded rectangle
      const drawRoundedRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
      ) => {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(
          x + width,
          y + height,
          x + width - radius,
          y + height
        );
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.stroke();
      };

      // Draw the rounded rectangle
      drawRoundedRect(
        ctx,
        clampedViewX,
        clampedViewY,
        viewWidthScaled,
        viewHeightScaled,
        borderRadius
      );

      ctx.restore();

      const minimapImage = minimapStageRef.current!.findOne(
        'Image'
      ) as Konva.Image;
      if (minimapImage && minimapCanvasRef.current) {
        minimapImage.image(minimapCanvasRef.current);
        minimapImage.getLayer()?.batchDraw();
      }

      redrawRequested.current = false;
    });
  }, [
    layers,
    stageWidth,
    stageHeight,
    stageScale,
    panWorldX,
    panWorldY,
    worldBounds,
    pixelSize,
  ]);

  // Redraw on changes
  useEffect(() => {
    if (isCanvasReady) {
      redrawMinimap();
    }
  }, [redrawMinimap, isCanvasReady]);

  // Handle minimap drag
  const handleMinimapDrag = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDragging.current) return;
      const pos = minimapStageRef.current?.getPointerPosition();
      if (!pos) return;

      const viewWidth = stageWidth / stageScale;
      const viewHeight = stageHeight / stageScale;
      const effectiveMinX = Math.min(
        worldBounds.minX,
        Math.floor(panWorldX / pixelSize)
      );
      const effectiveMinY = Math.min(
        worldBounds.minY,
        Math.floor(panWorldY / pixelSize)
      );
      const effectiveMaxX = Math.max(
        worldBounds.maxX,
        Math.ceil((panWorldX + viewWidth) / pixelSize)
      );
      const effectiveMaxY = Math.max(
        worldBounds.maxY,
        Math.ceil((panWorldY + viewHeight) / pixelSize)
      );

      const worldWidth = effectiveMaxX - effectiveMinX;
      const worldHeight = effectiveMaxY - effectiveMinY;

      const scale = Math.min(
        MINIMAP_SIZE / (worldWidth * pixelSize),
        MINIMAP_SIZE / (worldHeight * pixelSize)
      );

      const drawnWidth = worldWidth * pixelSize * scale;
      const drawnHeight = worldHeight * pixelSize * scale;
      const offsetMinimapX = (MINIMAP_SIZE - drawnWidth) / 2;
      const offsetMinimapY = (MINIMAP_SIZE - drawnHeight) / 2;

      const worldX =
        (pos.x - offsetMinimapX) / scale + effectiveMinX * pixelSize;
      const worldY =
        (pos.y - offsetMinimapY) / scale + effectiveMinY * pixelSize;

      const newPanX = worldX - viewWidth / 2;
      const newPanY = worldY - viewHeight / 2;

      setPanWorldX(newPanX);
      setPanWorldY(newPanY);
    },
    [
      worldBounds,
      stageWidth,
      stageHeight,
      stageScale,
      panWorldX,
      panWorldY,
      pixelSize,
      setPanWorldX,
      setPanWorldY,
    ]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      isDragging.current = true;
      handleMinimapDrag(e);
    },
    [handleMinimapDrag]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  if (!isCanvasReady || !minimapCanvasRef.current) {
    return null;
  }

  return (
    <div
      className="absolute right-2 bottom-2 rounded-md border-2 border-gray-950"
      style={{
        width: MINIMAP_SIZE,
        height: MINIMAP_SIZE,
        background: 'transparent',
        backdropFilter: 'blur(2px)',
      }}
    >
      <Stage
        ref={minimapStageRef}
        width={MINIMAP_SIZE}
        height={MINIMAP_SIZE}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMinimapDrag}
        className="absolute top-0 right-0 bottom-0 left-0 cursor-pointer"
      >
        <KonvaLayer>
          <KonvaImage
            image={minimapCanvasRef.current}
            width={MINIMAP_SIZE - 4} // 4 - from padding size
            height={MINIMAP_SIZE - 4}
          />
        </KonvaLayer>
      </Stage>
    </div>
  );
};
