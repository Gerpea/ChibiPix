'use client';

import React, { useMemo } from 'react';
import { Layer, Rect } from 'react-konva';
import { useAnimationStore } from '@/features/animation/model/animationStore';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { PIXEL_SIZE } from '../const';
import { usePixelBoardStore } from '../model/pixelBoardStore';

export const HighlightPixel: React.FC = () => {
  const { hoverPixel, pan, stage } = usePixelBoardStore();
  const { currentTool, toolSettings } = useToolbarStore();

  return (
    hoverPixel &&
    (currentTool === 'pencil' || currentTool === 'eraser') && (
      <Layer
        name="highlightLayer"
        listening={false}
        imageSmoothingEnabled={false}
      >
        {(() => {
          const size = toolSettings[currentTool]?.size || 1;
          const offset = Math.floor(size / 2);
          const highlightRects = [];
          for (let dy = -offset; dy < size - offset; dy++) {
            for (let dx = -offset; dx < size - offset; dx++) {
              const x =
                ((hoverPixel.col + dx) * PIXEL_SIZE - pan.x) * stage.scale;
              const y =
                ((hoverPixel.row + dy) * PIXEL_SIZE - pan.y) * stage.scale;
              highlightRects.push(
                <Rect
                  key={`${dx},${dy}`}
                  x={x}
                  y={y}
                  width={PIXEL_SIZE * stage.scale}
                  height={PIXEL_SIZE * stage.scale}
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
    )
  );
};
