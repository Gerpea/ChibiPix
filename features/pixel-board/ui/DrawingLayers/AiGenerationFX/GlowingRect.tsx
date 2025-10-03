'use client';

import React from 'react';
import { Group, Rect } from 'react-konva';

interface GlowingRectProps {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const GlowingRect: React.FC<GlowingRectProps> = ({
  x,
  y,
  width,
  height,
}) => {
  return (
    <Group x={x} y={y}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        stroke="rgb(150, 150, 150)"
        strokeWidth={1}
        strokeOpacity={0.8}
        shadowColor="rgb(150, 150, 150)"
        shadowOpacity={0.7}
        fill="rgba(150, 150, 150, 0.5)"
      />
    </Group>
  );
};
