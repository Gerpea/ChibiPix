'use client';

import Konva from 'konva';
import React, { useEffect, useMemo, useRef } from 'react';
import { Image, Layer } from 'react-konva';
import { usePixelBoardStore } from '../../model/pixelBoardStore';
import { useAnimationStore } from '@/features/animation/model/animationStore';

interface DrawingLayerProps {
  id: string;
}

export const DrawingLayer: React.FC<DrawingLayerProps> = ({ id }) => {
  const currentFrame = useAnimationStore(
    (state) => state.frames[state.currentFrameIndex]
  );
  const { stage } = usePixelBoardStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<Konva.Image>(null);

  const layers = currentFrame?.layers ?? [];

  const layer = useMemo(() => layers.find((l) => l.id === id), [layers, id]);

  useEffect(() => {
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }
    if (canvas.width !== stage.width || canvas.height !== stage.height) {
      canvas.width = stage.width;
      canvas.height = stage.height;
    }
  }, [id, stage.width, stage.height]);

  return (
    canvasRef.current &&
    layer &&
    layer.visible && (
      <Layer opacity={layer.opacity / 100} imageSmoothingEnabled={false}>
        <Image
          ref={imageRef}
          image={canvasRef.current}
          width={stage.width}
          height={stage.height}
          x={0}
          y={0}
          listening={false}
        />
      </Layer>
    )
  );
};
