'use client';

import React, { useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';

const BOARD_WIDTH = 16;
const BOARD_HEIGHT = 16;
const PIXEL_SIZE = 20;

// Generate a checkerboard pattern
const Checkerboard = () => {
  const rows = [];
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
  return rows;
};

const PixelBoard = () => {
  const [pixels, setPixels] = useState(
    Array(BOARD_HEIGHT)
      .fill(null)
      .map(() => Array(BOARD_WIDTH).fill('transparent'))
  );

  const handleClick = (row: number, col: number) => {
    const newPixels = pixels.map((arr) => arr.slice());
    newPixels[row][col] =
      newPixels[row][col] === 'transparent' ? '#000000' : 'transparent';
    setPixels(newPixels);
  };

  const isDrawing = useRef(false);
  const fillColor = '#000000'; // default color

  const handleDraw = (row: number, col: number) => {
    const newPixels = pixels.map((arr) => arr.slice());
    newPixels[row][col] = fillColor;
    setPixels(newPixels);
  };

  return (
    <Stage
      width={BOARD_WIDTH * PIXEL_SIZE}
      height={BOARD_HEIGHT * PIXEL_SIZE}
      style={{ border: '1px solid #333', cursor: 'crosshair' }}
      onMouseDown={() => (isDrawing.current = true)}
      onMouseUp={() => (isDrawing.current = false)}
      onMouseLeave={() => (isDrawing.current = false)}
    >
      {/* Background checkerboard */}
      <Layer>
        <Checkerboard />
      </Layer>

      {/* Pixel layer */}
      <Layer>
        {pixels.map((rowArr, row) =>
          rowArr.map((color, col) => (
            <Rect
              key={`${row}-${col}`}
              x={col * PIXEL_SIZE}
              y={row * PIXEL_SIZE}
              width={PIXEL_SIZE}
              height={PIXEL_SIZE}
              fill={color === 'transparent' ? undefined : color}
              //   onClick={() => handleClick(row, col)}
              onMouseDown={() => handleDraw(row, col)}
              onMouseEnter={() => {
                if (isDrawing.current) handleDraw(row, col);
              }}
            />
          ))
        )}
      </Layer>
    </Stage>
  );
};

export default PixelBoard;
