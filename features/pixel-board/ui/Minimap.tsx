import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Stage, Layer as KonvaLayer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { Layer } from '@/features/animation/model/animationStore';
import { intToHex } from '@/shared/utils/colors';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { PIXEL_SIZE } from '../const';

const MINIMAP_SIZE = 150;

interface MinimapProps {
  layers: Layer[];
}

export const Minimap: React.FC<MinimapProps> = ({ layers }) => {
  const { pan, stage, bounds, setPan } = usePixelBoardStore();
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
      const viewWidth = stage.width / stage.scale;
      const viewHeight = stage.height / stage.scale;
      const effectiveMinX = Math.min(
        bounds.minX,
        Math.floor(pan.x / PIXEL_SIZE)
      );
      const effectiveMinY = Math.min(
        bounds.minY,
        Math.floor(pan.y / PIXEL_SIZE)
      );
      const effectiveMaxX = Math.max(
        bounds.maxX,
        Math.ceil((pan.x + viewWidth) / PIXEL_SIZE)
      );
      const effectiveMaxY = Math.max(
        bounds.maxY,
        Math.ceil((pan.y + viewHeight) / PIXEL_SIZE)
      );

      const worldWidth = effectiveMaxX - effectiveMinX;
      const worldHeight = effectiveMaxY - effectiveMinY;

      const scale = Math.min(
        MINIMAP_SIZE / (worldWidth * PIXEL_SIZE),
        MINIMAP_SIZE / (worldHeight * PIXEL_SIZE)
      );

      const drawnWidth = worldWidth * PIXEL_SIZE * scale;
      const drawnHeight = worldHeight * PIXEL_SIZE * scale;
      const offsetMinimapX = (MINIMAP_SIZE - drawnWidth) / 2;
      const offsetMinimapY = (MINIMAP_SIZE - drawnHeight) / 2;

      ctx.clearRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

      ctx.save();
      ctx.translate(offsetMinimapX, offsetMinimapY);

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
      const pixelSizeScaled = PIXEL_SIZE * scale + 0.1;
      layers.forEach((layer) => {
        if (!layer.visible) return;
        for (const [key, color] of layer.pixels.entries()) {
          const [x, y] = key.split(',').map(Number);
          const hexColor = intToHex(color);
          if (hexColor !== 'transparent') {
            const canvasX = (x - effectiveMinX) * PIXEL_SIZE * scale;
            const canvasY = (y - effectiveMinY) * PIXEL_SIZE * scale;
            ctx.fillStyle = hexColor;
            ctx.fillRect(canvasX, canvasY, pixelSizeScaled, pixelSizeScaled);
          }
        }
      });

      // Draw viewport rectangle
      const viewX = (pan.x - effectiveMinX * PIXEL_SIZE) * scale;
      const viewY = (pan.y - effectiveMinY * PIXEL_SIZE) * scale;
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

      const borderRadius = 6;
      ctx.strokeStyle = '#6B7280';
      ctx.lineWidth = lineWidth;

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
  }, [layers, stage, pan, bounds]);

  useEffect(() => {
    if (isCanvasReady) {
      redrawMinimap();
    }
  }, [redrawMinimap, isCanvasReady]);

  const handleMinimapDrag = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!isDragging.current) return;
      const pos = minimapStageRef.current?.getPointerPosition();
      if (!pos) return;

      const viewWidth = stage.width / stage.scale;
      const viewHeight = stage.height / stage.scale;
      const effectiveMinX = Math.min(
        bounds.minX,
        Math.floor(pan.x / PIXEL_SIZE)
      );
      const effectiveMinY = Math.min(
        bounds.minY,
        Math.floor(pan.y / PIXEL_SIZE)
      );
      const effectiveMaxX = Math.max(
        bounds.maxX,
        Math.ceil((pan.x + viewWidth) / PIXEL_SIZE)
      );
      const effectiveMaxY = Math.max(
        bounds.maxY,
        Math.ceil((pan.y + viewHeight) / PIXEL_SIZE)
      );

      const worldWidth = effectiveMaxX - effectiveMinX;
      const worldHeight = effectiveMaxY - effectiveMinY;

      const scale = Math.min(
        MINIMAP_SIZE / (worldWidth * PIXEL_SIZE),
        MINIMAP_SIZE / (worldHeight * PIXEL_SIZE)
      );

      const drawnWidth = worldWidth * PIXEL_SIZE * scale;
      const drawnHeight = worldHeight * PIXEL_SIZE * scale;
      const offsetMinimapX = (MINIMAP_SIZE - drawnWidth) / 2;
      const offsetMinimapY = (MINIMAP_SIZE - drawnHeight) / 2;

      const worldX =
        (pos.x - offsetMinimapX) / scale + effectiveMinX * PIXEL_SIZE;
      const worldY =
        (pos.y - offsetMinimapY) / scale + effectiveMinY * PIXEL_SIZE;

      const newPanX = worldX - viewWidth / 2;
      const newPanY = worldY - viewHeight / 2;

      setPan({ x: newPanX, y: newPanY });
    },
    [bounds, stage, pan, setPan]
  );

  useEffect(() => {
    function handleMouseUp() {
      isDragging.current = false;
    }
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      isDragging.current = true;
      handleMinimapDrag(e);
    },
    [handleMinimapDrag]
  );

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
            width={MINIMAP_SIZE - 4}
            height={MINIMAP_SIZE - 4}
          />
        </KonvaLayer>
      </Stage>
    </div>
  );
};
