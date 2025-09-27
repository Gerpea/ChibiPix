'use client';

import Konva from 'konva';
import React, { useCallback, useEffect } from 'react';
import { Group, Image, Layer, Rect } from 'react-konva';

interface StopButtonProps {
  width: number;
  onStop: () => void;
}

export const StopButton: React.FC<StopButtonProps> = ({ width, onStop }) => {
  const redrawLayers = useCallback(() => {
    checkerboardRef.current?.redraw();
    if (!stageRef.current) return;

    const minPixelX = Math.floor(pan.x / PIXEL_SIZE);
    const minPixelY = Math.floor(pan.y / PIXEL_SIZE);
    const maxPixelX = Math.ceil(
      (pan.x + stage.width / stage.scale) / PIXEL_SIZE
    );
    const maxPixelY = Math.ceil(
      (pan.y + stage.height / stage.scale) / PIXEL_SIZE
    );

    layers.forEach((layer, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (layer.visible) {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        ctx.imageSmoothingQuality = 'low';
        const snappedPanX = Math.floor(-pan.x * stage.scale);
        const snappedPanY = Math.floor(-pan.y * stage.scale);
        ctx.translate(snappedPanX, snappedPanY);

        for (const [key, color] of layer.pixels.entries()) {
          const [x, y] = key.split(',').map(Number);
          if (
            x >= minPixelX &&
            x < maxPixelX &&
            y >= minPixelY &&
            y < maxPixelY
          ) {
            const hexColor = intToHex(color);
            if (hexColor !== 'transparent') {
              ctx.fillStyle = hexColor;
              ctx.fillRect(
                Math.floor(x * PIXEL_SIZE * stage.scale),
                Math.floor(y * PIXEL_SIZE * stage.scale),
                Math.ceil(PIXEL_SIZE * stage.scale),
                Math.ceil(PIXEL_SIZE * stage.scale)
              );
            }
          }
        }
        ctx.restore();
      }

      const imageNode = imageRefs.current[index];
      if (imageNode) {
        imageNode.image(canvas);
      }
    });

    stageRef.current.batchDraw();
  }, [layers, stage.width, stage.height, pan.x, pan.y, stage.scale]);

  useEffect(() => {
    redrawLayers();
  }, [redrawLayers]);

  return layers.map(
    (layer, index) =>
      layer.visible && (
        <Layer
          key={layer.id}
          opacity={layer.opacity / 100}
          imageSmoothingEnabled={false}
        >
          <Image
            ref={(node) => {
              if (node) {
                imageRefs.current[index] = node;
              }
            }}
            image={canvasRefs.current[index]}
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
