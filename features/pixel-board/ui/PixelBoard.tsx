'use client';

import React, { useRef, useMemo, useEffect, useCallback } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { Checkerboard, CheckerboardHandle } from './Checkerboard';
import { Minimap } from './Minimap';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { AiGenerationAreas } from './AiGenerationAreas/AiGenerationArea';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { HighlightPixel } from './HighlightPixel';
import { getPointerPos } from '../utils';
import { DrawingLayers } from './DrawingLayers/DrawingLayers';

export const PixelBoard: React.FC = () => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { aiAreas } = useAnimationStore();
  const { currentTool } = useToolbarStore();

  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

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
      const stageEl = e.target.getStage();
      if (!stageEl) return;
      if (isPanning.current && lastPanPos.current) {
        const currentPos = stageEl.getPointerPosition();
        if (currentPos) {
          const dx = (currentPos.x - lastPanPos.current.x) / stage.scale;
          const dy = (currentPos.y - lastPanPos.current.y) / stage.scale;
          setPan({ x: pan.x - dx, y: pan.y - dy });
          lastPanPos.current = currentPos;
        }
        return;
      }

      const pos = getPointerPos(e, stage, pan);
      if (pos && (currentTool === 'pencil' || currentTool === 'eraser')) {
        setHoverPixel(pos);
      } else {
        setHoverPixel(undefined);
      }
    },
    [stage, pan, currentTool, setHoverPixel, setPan]
  );

  const handleMouseLeave = useCallback(() => {
    setHoverPixel(undefined);
  }, [setHoverPixel]);

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!(e.evt.button == 1 || currentTool === 'pan')) return;
      e.evt.preventDefault();

      isPanning.current = true;
      lastPanPos.current = e.target.getStage()?.getPointerPosition() || null;
    },
    [currentTool]
  );

  const handleMouseUp = () => {
    isPanning.current = false;
    lastPanPos.current = null;
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    e.evt.preventDefault();
  };

  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stageEl = e.target.getStage();
    if (!stageEl) return;

    const scaleBy = 1.1;
    const oldScale = stage.scale;
    const pointer = stageEl.getPointerPosition();
    if (!pointer) return;

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const boundedScale = Math.max(0.5, Math.min(newScale, 32));
    const snappedScale = Math.round(boundedScale * 10) / 10;

    const newPanWorldX =
      pan.x + pointer.x / oldScale - pointer.x / boundedScale;
    const newPanWorldY =
      pan.y + pointer.y / oldScale - pointer.y / boundedScale;

    setStage({ scale: snappedScale });
    setPan({ x: newPanWorldX, y: newPanWorldY });
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
  }, [layer, currentTool, hoverPixel, aiAreas]);

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
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
      >
        <Checkerboard ref={checkerboardRef} />
        <DrawingLayers />
        {/* <AiGenerationAreas />
        <HighlightPixel /> */}
      </Stage>
      <Minimap layers={layers} />
    </div>
  );
};
