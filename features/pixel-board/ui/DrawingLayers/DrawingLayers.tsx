'use client';

import React, { useCallback, useRef } from 'react';
import { Layer } from 'react-konva';
import Konva from 'konva';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { usePixelBoardStore } from '../../model/pixelBoardStore';
import { DrawingLayer, DrawingLayerHandle } from './DrawingLayer';
import { getPointerPos } from '../../utils';

export const DrawingLayers: React.FC = () => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { currentTool, primaryColor, secondaryColor } = useToolbarStore();
  const { stage, pan } = usePixelBoardStore();

  const layerRefs = useRef<Map<string, DrawingLayerHandle>>(new Map());

  const layers = currentFrame?.layers ?? [];
  const activeLayerId = currentFrame.activeLayerId;

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPointerPos(e, stage, pan);
      if (pos) {
        layerRefs.current.get(activeLayerId)?.onMouseMove(pos.row, pos.col, e);
      }
    },
    [currentTool, stage, pan, activeLayerId]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPointerPos(e, stage, pan);
      if (pos) {
        layerRefs.current.get(activeLayerId)?.onMouseDown(pos.row, pos.col, e);
      }
    },
    [activeLayerId, stage, pan, primaryColor, secondaryColor]
  );

  const handleMouseUp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = getPointerPos(e, stage, pan);
      if (pos) {
        layerRefs.current.get(activeLayerId)?.onMouseUp(pos.row, pos.col, e);
      }
    },
    [activeLayerId, stage, pan]
  );

  const handleMouseLeave = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      layerRefs.current.get(activeLayerId)?.onMouseLeave(e);
    },
    [activeLayerId]
  );

  const handleMouseWheel = useCallback(
    (e: Konva.KonvaEventObject<WheelEvent>) => {
      const pos = getPointerPos(e, stage, pan);
      if (pos) {
        layerRefs.current.get(activeLayerId)?.onWheel(pos.row, pos.col, e);
      }
    },
    [activeLayerId, stage, pan]
  );

  return (
    <Layer
      imageSmoothingEnabled={false}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={handleMouseWheel}
      width={stage.width}
      height={stage.height}
    >
      {layers.map(
        (layer) =>
          layer.visible && (
            <DrawingLayer
              key={layer.id}
              ref={(node) => {
                if (node) layerRefs.current.set(layer.id, node);
                else layerRefs.current.delete(layer.id);
              }}
              id={layer.id}
            />
          )
      )}
    </Layer>
  );
};
