import React, { JSX } from 'react';
import { Rect, Layer } from 'react-konva';
import { usePixelStore } from '../model/pixelStore';

export const Checkerboard = () => {
  const { BOARD_WIDTH, BOARD_HEIGHT, PIXEL_SIZE } = usePixelStore();
  const rows: JSX.Element[] = [];

  for (let y = 0; y < BOARD_HEIGHT; y++) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
      rows.push(
        <Rect
          key={`cb-${x}-${y}`}
          x={x * PIXEL_SIZE}
          y={y * PIXEL_SIZE}
          width={PIXEL_SIZE}
          height={PIXEL_SIZE}
          fill={(x + y) % 2 === 0 ? '#cecece' : '#ffffff'}
        />
      );
    }
  }

  return <Layer>{rows}</Layer>;
};
