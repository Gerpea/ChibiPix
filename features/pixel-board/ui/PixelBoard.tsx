'use client';

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Checkerboard, CheckerboardHandle } from './Checkerboard';
import { Minimap } from './Minimap';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { HighlightPixel } from './HighlightPixel';
import { getPointerPos } from '../utils';
import { DrawingLayers } from './DrawingLayers/DrawingLayers';
import { useAIStore } from '@/features/ai-generation/model/aiStore';
import { isPixelInActiveAIArea } from '@/features/ai-generation/lib/utils';

export const PixelBoard: React.FC = () => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { generations } = useAIStore();
  const { currentTool } = useToolbarStore();

  const checkerboardRef = useRef<CheckerboardHandle>(null);
  const parentRef = useRef<HTMLDivElement>(null);

  const { hoverPixel, stage, pan, setBounds, setHoverPixel, setStage, setPan } =
    usePixelBoardStore();

  const layers = useMemo(() => currentFrame?.layers ?? [], [currentFrame]);
  const activeLayerId = useMemo(
    () => currentFrame?.activeLayerId ?? null,
    [currentFrame]
  );
  const layer = useMemo(
    () => layers.find((l) => l.id === activeLayerId),
    [layers, activeLayerId]
  );

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
    setBounds({ minX, minY, maxX, maxY });
  }, [layers, setBounds]);

  useEffect(() => {
    const updateSize = () => {
      if (!parentRef.current) return;
      const ref = parentRef.current;
      const { width, height } = ref.getBoundingClientRect();
      setStage({ width, height });
    };

    const ref = parentRef.current;
    const observer = new ResizeObserver(updateSize);
    if (ref) {
      observer.observe(ref);
    }
    return () => {
      if (ref) {
        observer.unobserve(ref);
      }
      observer.disconnect();
    };
  }, [setStage]);

  useEffect(() => {
    checkerboardRef.current?.redraw();
  }, [stage, pan]);

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (currentTool === 'pencil' || currentTool === 'eraser') {
        const pos = getPointerPos(e, stage, pan);
        if (pos) {
          setHoverPixel(pos);
        }
      } else {
        setHoverPixel(undefined);
      }
    },
    [stage, pan, currentTool, setHoverPixel, setPan]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverPixel(undefined);
  }, [setHoverPixel]);

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
  };

  const getCursor = useCallback(() => {
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
      isPixelInActiveAIArea(
        { x: hoverPixel.col, y: hoverPixel.row },
        generations,
        activeLayerId
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
      default:
        return 'crosshair';
    }
  }, [layer?.locked, currentTool, generations, activeLayerId]);

  const stageStyle = useMemo(() => ({ cursor: getCursor() }), [getCursor]);

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
        width={stage.width}
        height={stage.height}
        style={stageStyle}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
      >
        <Checkerboard ref={checkerboardRef} />
        <DrawingLayers />
        <HighlightPixel />
      </Stage>
      <Minimap layers={layers} />
    </div>
  );
};
