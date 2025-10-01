'use client';

import React, { useMemo } from 'react';
import { Layer, Rect } from 'react-konva';
import { useToolbarStore } from '@/features/toolbar/model/toolbarStore';
import { PIXEL_SIZE } from '../const';
import { usePixelBoardStore } from '../model/pixelBoardStore';
import { useTheme } from 'next-themes';

export const HighlightPixel: React.FC = () => {
  const { hoverPixel, pan, stage } = usePixelBoardStore();
  const { currentTool, toolSettings } = useToolbarStore();
  const { resolvedTheme } = useTheme();

  const highlightColors = useMemo(() => {
    const isDark = resolvedTheme === 'dark';
    return {
      fill: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.3)',
      stroke: isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    };
  }, [resolvedTheme]);

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
                  width={PIXEL_SIZE * stage.scale + 0.5}
                  height={PIXEL_SIZE * stage.scale + 0.5}
                  fill={highlightColors.fill}
                  stroke={highlightColors.stroke}
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
