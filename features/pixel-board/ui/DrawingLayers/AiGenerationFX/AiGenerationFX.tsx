'use client';

import { PIXEL_SIZE } from '@/features/pixel-board/const';
import { usePixelBoardStore } from '@/features/pixel-board/model/pixelBoardStore';
import React from 'react';
import { Group } from 'react-konva';
import { GlowingRect } from './GlowingRect';
import { FlipFlopPixelGrid } from './FlipFlopPixelGrid';
import { StopButton } from './StopButton';

interface AIGenerationFXProps {
  // @ts-expect-error will be fixed later
  generation: Generation;
  onStop: (id: string) => void;
}

export const AIGenerationFX: React.FC<AIGenerationFXProps> = ({
  generation,
  onStop,
}) => {
  const { pan, stage } = usePixelBoardStore();

  const { startX, startY } = generation.area!;
  const x = Math.floor((startX * PIXEL_SIZE - pan.x) * stage.scale);
  const y = Math.floor((startY * PIXEL_SIZE - pan.y) * stage.scale);
  const width = Math.ceil(16 * PIXEL_SIZE * stage.scale);
  const height = Math.ceil(16 * PIXEL_SIZE * stage.scale);

  const handleStop = () => {
    onStop(generation.id);
  };

  return (
    <Group key={generation.id} x={x} y={y}>
      <GlowingRect x={0} y={0} width={width} height={height} />
      <FlipFlopPixelGrid x={0} y={0} width={width} height={height} />
      <StopButton width={width} onStop={handleStop} />
    </Group>
  );
};
