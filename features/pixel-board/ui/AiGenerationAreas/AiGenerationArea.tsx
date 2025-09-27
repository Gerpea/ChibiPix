'use client';

import { useCallback, useMemo } from 'react';
import { Group, Layer } from 'react-konva';
import { useAIStore } from '@/features/ai-generation/models/aiStore';
import { PIXEL_SIZE } from '../../const';
import { usePixelBoardStore } from '../../model/pixelBoardStore';
import { FlipFlopPixelGrid } from './FlipFlopPixelGrid';
import { GlowingRect } from './GlowingRect';
import { StopButton } from './StopButton';

export const AiGenerationAreas: React.FC = () => {
  const { pan, scale } = usePixelBoardStore();
  const { generations, stopGeneration } = useAIStore();
  const activeGenerations = useMemo(
    () =>
      Object.values(generations).filter((gen) => gen.isGenerating && gen.area),
    [generations]
  );

  const handleStopGeneration = useCallback(
    (id: string) => () => {
      stopGeneration(id);
    },
    []
  );

  return (
    <Layer name="aiGenerationsLayer" imageSmoothingEnabled={false}>
      {activeGenerations.map((gen) => {
        if (!gen.area) return null;
        const { startX, startY } = gen.area;
        const x = Math.floor((startX * PIXEL_SIZE - pan.x) * scale);
        const y = Math.floor((startY * PIXEL_SIZE - pan.y) * scale);
        const width = Math.ceil(16 * PIXEL_SIZE * scale);
        const height = Math.ceil(16 * PIXEL_SIZE * scale);

        return (
          <Group
            key={gen.id}
            x={x}
            y={y}
            clipFunc={(ctx) => {
              // Clip to the rounded box shape
              const radius = 8;
              const w = width;
              const h = height;
              ctx.beginPath();
              ctx.moveTo(radius, 0);
              ctx.lineTo(w - radius, 0);
              ctx.quadraticCurveTo(w, 0, w, radius);
              ctx.lineTo(w, h - radius);
              ctx.quadraticCurveTo(w, h, w - radius, h);
              ctx.lineTo(radius, h);
              ctx.quadraticCurveTo(0, h, 0, h - radius);
              ctx.lineTo(0, radius);
              ctx.quadraticCurveTo(0, 0, radius, 0);
              ctx.closePath();
            }}
          >
            <GlowingRect x={0} y={0} width={width} height={height} />
            <FlipFlopPixelGrid x={0} y={0} width={width} height={height} />
            <StopButton width={width} onStop={handleStopGeneration(gen.id)} />
          </Group>
        );
      })}
    </Layer>
  );
};
