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
  useToolbarStore,
  Tool as StoreTool,
} from '@/features/toolbar/model/toolbarStore';
import { intToHex } from '@/shared/utils/colors';
import { PIXEL_SIZE } from '../../const';
import { usePixelBoardStore } from '../../model/pixelBoardStore';
import { Tool, ToolContext } from '../../tools/Tool';
import { PencilTool } from '../../tools/Pencil';
import { FillTool } from '../../tools/Fill';
import { PanTool } from '../../tools/Pan';
import { ZoomTool } from '../../tools/Zoom';
import { withPan } from '../../tools/wrappers/PanWrapper';
import { EraserTool } from '../../tools/Eraser';
import { withZoom } from '../../tools/wrappers/ZoomWrapper';

function getTool(currentTool: StoreTool, ctx: ToolContext): Tool | undefined {
  switch (currentTool) {
    case 'pencil':
      return new (withZoom(withPan(PencilTool)))(ctx);
    case 'fill':
      return new (withPan(FillTool))(ctx);
    case 'eraser':
      return new (withPan(EraserTool))(ctx);
    case 'pan':
      return new (withZoom(PanTool))(ctx);
    case 'zoom':
      return new (withPan(ZoomTool))(ctx);
  }
}

interface DrawingLayerProps {
  id: string;
}

export type DrawingLayerHandle = Tool;

export const DrawingLayer = forwardRef<DrawingLayerHandle, DrawingLayerProps>(
  ({ id }, ref) => {
    const currentFrame = useAnimationStore(
      (state) => state.frames[state.currentFrameIndex]
    );
    const { stage, pan } = usePixelBoardStore();
    const { currentTool } = useToolbarStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<Konva.Image>(null);
    const tool = useRef<Tool | undefined>(null);

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
        onMouseDown(row, col, e) {
          if (tool.current) return;
          if (!imageRef.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          tool.current = getTool(currentTool, {
            ctx: ctx,
            image: imageRef.current,
          });
          tool.current?.onMouseDown(row, col, e);
        },
        onMouseMove(row, col, e) {
          tool.current?.onMouseMove(row, col, e);
        },
        onMouseUp(row, col, e) {
          tool.current?.onMouseUp(row, col, e);
          tool.current = null;
        },
        onWheel(row, col, e) {
          if (!imageRef.current) return;
          const ctx = canvasRef.current?.getContext('2d');
          if (!ctx) return;
          tool.current = getTool(currentTool, {
            ctx: ctx,
            image: imageRef.current,
          });
          tool.current?.onWheel(row, col, e);
          tool.current = null;
        },
        onMouseLeave(e) {
          tool.current?.onMouseLeave(e);
          tool.current = null;
        },
      }),
      []
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
