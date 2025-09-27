'use client';

import React, { useCallback, useRef } from 'react';
import { Layer } from 'react-konva';
import Konva from 'konva';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { hexToInt } from '@/shared/utils/colors';
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

  const isDrawing = useRef(false);
  const pointerColor = useRef(hexToInt(primaryColor));

  const layers = currentFrame?.layers ?? [];
  const activeLayerId = currentFrame.activeLayerId;

  const handleMouseMove = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (
        isDrawing.current &&
        (currentTool === 'pencil' || currentTool === 'eraser')
      ) {
        const pos = getPointerPos(e, stage, pan);
        if (pos) {
          layerRefs.current
            .get(activeLayerId)
            ?.paint(pos.row, pos.col, pointerColor.current);
        }
      }
    },
    [currentTool, stage, pan, activeLayerId]
  );

  const handleMouseDown = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!(e.evt.button === 0 || e.evt.button === 2)) return;
      e.evt.preventDefault();

      isDrawing.current = true;
      pointerColor.current = hexToInt(
        e.evt.button === 2 ? secondaryColor : primaryColor
      );
      const pos = getPointerPos(e, stage, pan);
      if (pos) {
        layerRefs.current
          .get(activeLayerId)
          ?.paint(pos.row, pos.col, pointerColor.current);
      }
      e.evt.preventDefault();
      e.evt.stopPropagation();
    },
    [activeLayerId, stage, pan, primaryColor, secondaryColor]
  );

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    layerRefs.current.get(activeLayerId)?.flush();
  }, [activeLayerId]);

  console.log(layers);
  return (
    <Layer
      imageSmoothingEnabled={false}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
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
