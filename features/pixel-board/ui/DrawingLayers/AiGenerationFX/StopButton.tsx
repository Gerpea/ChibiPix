'use client';

import Konva from 'konva';
import React, { useCallback } from 'react';
import { Group, Rect } from 'react-konva';

interface StopButtonProps {
  width: number;
  onStop: () => void;
}

export const StopButton: React.FC<StopButtonProps> = ({ width, onStop }) => {
  const handleMouseEnter = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = 'pointer';
    },
    []
  );
  const handleMouseLeave = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const container = e.target.getStage()?.container();
      if (container) container.style.cursor = 'default';
    },
    []
  );
  return (
    <Group
      x={width - 30}
      y={10}
      onClick={onStop}
      onTap={onStop}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Rect
        width={20}
        height={20}
        cornerRadius={4}
        fill="#e53935"
        shadowColor="#e53935"
        shadowBlur={6}
        shadowOpacity={0.6}
      />

      <Rect x={6} y={6} width={8} height={8} cornerRadius={2} fill="white" />
    </Group>
  );
};
