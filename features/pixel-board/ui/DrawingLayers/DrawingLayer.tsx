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
import { useAIStore } from '@/features/ai-generation/model/aiStore';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import {
  useToolbarStore,
  Tool as StoreTool,
  TOOLS,
} from '@/features/toolbar/model/toolbarStore';
import { hexToInt, intToHex } from '@/shared/utils/colors';
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
import { AIGenerationFX } from './AiGenerationFX/AiGenerationFX';
import { SelectionRectangleTool } from '../../tools/SelectionRectangle';

function createTool(
  currentTool: StoreTool,
  ctx: ToolContext
): Tool | undefined {
  switch (currentTool) {
    case 'pencil':
      return new (withZoom(withPan(PencilTool)))(ctx);
    case 'fill':
      return new (withZoom(withPan(FillTool)))(ctx);
    case 'eraser':
      return new (withZoom(withPan(EraserTool)))(ctx);
    case 'selection-rectangle':
      return new (withZoom(withPan(SelectionRectangleTool)))(ctx);
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
    const { generations, stopGeneration } = useAIStore();

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<Konva.Image>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
    const overlayImageRef = useRef<Konva.Image>(null);
    const tools = useRef<Map<string, Tool>>(new Map());

    const layers = useMemo(() => currentFrame?.layers ?? [], [currentFrame]);
    const layer = useMemo(() => layers.find((l) => l.id === id), [layers, id]);

    const activeGeneration = useMemo(
      () =>
        Object.values(generations).find(
          (gen) => gen.isGenerating && gen.layerId === id && gen.area
        ),
      [generations, id]
    );

    const redraw = useCallback(() => {
      if (!layer?.visible) return;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const combinedPixels = new Map<string, number>(layer.pixels);

      if (activeGeneration) {
        for (const pixel of activeGeneration.generatedPixels) {
          const absX = pixel.x + activeGeneration.area!.startX;
          const absY = pixel.y + activeGeneration.area!.startY;
          const key = `${absX},${absY}`;
          const colorInt = hexToInt(pixel.color);
          combinedPixels.set(key, colorInt);
        }
      }

      const minPixelX = Math.floor(pan.x / PIXEL_SIZE);
      const minPixelY = Math.floor(pan.y / PIXEL_SIZE);
      const maxPixelX = Math.ceil(
        (pan.x + stage.width / stage.scale) / PIXEL_SIZE
      );
      const maxPixelY = Math.ceil(
        (pan.y + stage.height / stage.scale) / PIXEL_SIZE
      );

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.imageSmoothingQuality = 'low';
      const snappedPanX = Math.floor(-pan.x * stage.scale);
      const snappedPanY = Math.floor(-pan.y * stage.scale);
      ctx.translate(snappedPanX, snappedPanY);

      for (const [key, color] of combinedPixels.entries()) {
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
    }, [stage, pan, layer, id, generations, activeGeneration]);

    useEffect(() => redraw(), [redraw]);

    useEffect(() => {
      let canvas = canvasRef.current;
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvasRef.current = canvas;
      }
      if (!overlayCanvasRef.current) {
        const oc = document.createElement('canvas');
        overlayCanvasRef.current = oc;
      }
      const oc = overlayCanvasRef.current!;
      if (canvas.width !== stage.width || canvas.height !== stage.height) {
        canvas.width = stage.width;
        canvas.height = stage.height;
      }
      if (oc.width !== stage.width || oc.height !== stage.height) {
        oc.width = stage.width;
        oc.height = stage.height;
      }

      redraw();
    }, [id, stage.width, stage.height, currentFrame]);

    useEffect(() => {
      return () => {
        tools.current.forEach((tool) => tool.destroy?.());
      };
    }, []);

    const getTool = useCallback(
      (toolName: StoreTool) => {
        let tool = tools.current.get(toolName);
        if (!tool) {
          const ctx = canvasRef.current?.getContext('2d');
          const overlayCtx = overlayCanvasRef.current?.getContext('2d');
          if (
            !ctx ||
            !overlayCtx ||
            !imageRef.current ||
            !overlayImageRef.current
          )
            return;
          const toolInstance = createTool(toolName as StoreTool, {
            ctx: ctx,
            overlayCtx: overlayCtx,
            image: imageRef.current,
            overlayImage: overlayImageRef.current,
          });
          if (!toolInstance) return;
          tools.current.set(toolName, toolInstance);
          tool = toolInstance;
        }
        return tool;
      },
      [id, currentFrame]
    );

    useImperativeHandle(
      ref,
      () => ({
        onMouseDown(row, col, e) {
          const tool = getTool(currentTool);
          if (!tool) return;
          tool.onMouseDown(row, col, e);
        },
        onMouseMove(row, col, e) {
          const tool = getTool(currentTool);
          if (!tool) return;
          tool.onMouseMove(row, col, e);
        },
        onMouseUp(row, col, e) {
          const tool = getTool(currentTool);
          if (!tool) return;
          tool.onMouseUp(row, col, e);
        },
        onWheel(row, col, e) {
          const tool = getTool(currentTool);
          if (!tool) return;
          tool.onWheel(row, col, e);
        },
        onMouseLeave(e) {
          const tool = getTool(currentTool);
          if (!tool) return;
          tool.onMouseLeave(e);
        },
      }),
      [currentTool]
    );

    return (
      canvasRef.current &&
      layer &&
      layer.visible && (
        <>
          <KonvaImage
            ref={imageRef}
            image={canvasRef.current}
            width={stage.width}
            height={stage.height}
            x={0}
            y={0}
          />
          {activeGeneration && (
            <AIGenerationFX
              generation={activeGeneration}
              onStop={stopGeneration}
            />
          )}
          <KonvaImage
            ref={overlayImageRef}
            image={overlayCanvasRef.current ?? undefined}
            width={stage.width}
            height={stage.height}
            x={0}
            y={0}
            listening={false}
            perfectDrawEnabled={false}
          />
        </>
      )
    );
  }
);

DrawingLayer.displayName = 'DrawingLayer';
