import { useRef, useEffect, useState, useMemo } from 'react';
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement } from '@dnd-kit/modifiers';
import { Frame } from '@/features/animation/model/animationStore';
import { DraggableItem } from './DraggableItem';
import { useTheme } from 'next-themes';

interface SpritesheetPreviewProps {
  selectedFramesList: Frame[];
  positions: { [id: string]: { x: number; y: number } };
  tileSizes: { [id: string]: { w: number; h: number } };
  padding: number;
  columns: number;
  gridCellSize: number;
  consistentSize: boolean;
  maxContentW: number;
  maxContentH: number;
  setPositions: React.Dispatch<
    React.SetStateAction<{ [id: string]: { x: number; y: number } }>
  >;
}

export const SpritesheetPreview: React.FC<SpritesheetPreviewProps> = ({
  selectedFramesList,
  positions,
  tileSizes,
  padding,
  columns,
  gridCellSize,
  consistentSize,
  maxContentW,
  maxContentH,
  setPositions,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const { resolvedTheme } = useTheme();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const { scale, offsetX, offsetY, totalWidth, totalHeight } = useMemo(() => {
    if (selectedFramesList.length === 0 || gridCellSize === 0) {
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        totalWidth: 0,
        totalHeight: 0,
      };
    }

    const maxRows = Math.ceil(selectedFramesList.length / columns);
    const totalGridWidth = columns * gridCellSize;
    const totalGridHeight = maxRows * gridCellSize;

    if (containerSize.width === 0 || containerSize.height === 0) {
      return {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        totalWidth: totalGridWidth,
        totalHeight: totalGridHeight,
      };
    }

    const scale =
      Math.min(
        containerSize.width / totalGridWidth,
        containerSize.height / totalGridHeight
      ) * 0.95;

    const offsetX = (containerSize.width - totalGridWidth * scale) / 2;
    const offsetY = (containerSize.height - totalGridHeight * scale) / 2;

    return {
      scale,
      offsetX,
      offsetY,
      totalWidth: totalGridWidth,
      totalHeight: totalGridHeight,
    };
  }, [
    selectedFramesList.length,
    columns,
    gridCellSize,
    containerSize.width,
    containerSize.height,
  ]);

  useEffect(() => {
    const canvas = bgRef.current;
    if (!canvas || containerSize.width === 0 || containerSize.height === 0)
      return;
    canvas.width = containerSize.width;
    canvas.height = containerSize.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const isDark = resolvedTheme === 'dark';

    const checkerColor1 = isDark ? '#222222' : '#ffffff';
    const checkerColor2 = isDark ? '#333333' : '#cccccc';
    const checkerSize = 10;
    for (let y = 0; y < canvas.height; y += checkerSize) {
      for (let x = 0; x < canvas.width; x += checkerSize) {
        ctx.fillStyle =
          (Math.floor(x / checkerSize) + Math.floor(y / checkerSize)) % 2 === 0
            ? checkerColor1
            : checkerColor2;
        ctx.fillRect(x, y, checkerSize, checkerSize);
      }
    }

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    if (selectedFramesList.length > 0) {
      ctx.strokeStyle = isDark ? '#888888' : '#555555';
      ctx.lineWidth = 1 / scale;
      ctx.fillStyle = isDark
        ? 'rgba(100, 100, 100, 0.2)'
        : 'rgba(200, 200, 200, 0.2)';

      const numRows = Math.ceil(selectedFramesList.length / columns);

      for (let i = 0; i < columns; i++) {
        for (let j = 0; j < numRows; j++) {
          ctx.beginPath();
          ctx.rect(
            i * gridCellSize,
            j * gridCellSize,
            gridCellSize,
            gridCellSize
          );
          ctx.fill();
          ctx.stroke();
        }
      }
    }

    ctx.restore();
  }, [
    gridCellSize,
    scale,
    offsetX,
    offsetY,
    totalWidth,
    totalHeight,
    containerSize,
    columns,
    selectedFramesList.length,
    resolvedTheme,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;

    const prevPosition = positions[id] || { x: 0, y: 0 };
    const draggedItemTileSize = tileSizes[id] || {
      w: gridCellSize,
      h: gridCellSize,
    };

    const newX = prevPosition.x + delta.x / scale;
    const newY = prevPosition.y + delta.y / scale;

    let col = Math.round(newX / gridCellSize);
    let row = Math.round(newY / gridCellSize);

    const maxRows = Math.ceil(selectedFramesList.length / columns);
    col = Math.max(0, Math.min(col, columns - 1));
    row = Math.max(0, Math.min(row, maxRows - 1));

    const targetFrame = selectedFramesList.find((frame) => {
      if (frame.id === id) return false;
      const pos = positions[frame.id];
      if (!pos) return false;

      const frameCol = Math.round(pos.x / gridCellSize);
      const frameRow = Math.round(pos.y / gridCellSize);

      return frameCol === col && frameRow === row;
    });

    setPositions((prev) => {
      const newPositions = { ...prev };

      const draggedItemSnappedPosition = {
        x: col * gridCellSize + (gridCellSize - draggedItemTileSize.w) / 2,
        y: row * gridCellSize + (gridCellSize - draggedItemTileSize.h) / 2,
      };

      if (targetFrame) {
        const targetId = targetFrame.id;
        const targetItemTileSize = tileSizes[targetId] || {
          w: gridCellSize,
          h: gridCellSize,
        };
        const originalDraggedItemPosition = prev[id];

        const originalCol = Math.round(
          originalDraggedItemPosition.x / gridCellSize
        );
        const originalRow = Math.round(
          originalDraggedItemPosition.y / gridCellSize
        );

        const targetItemNewPosition = {
          x:
            originalCol * gridCellSize +
            (gridCellSize - targetItemTileSize.w) / 2,
          y:
            originalRow * gridCellSize +
            (gridCellSize - targetItemTileSize.h) / 2,
        };

        newPositions[id] = draggedItemSnappedPosition;
        newPositions[targetId] = targetItemNewPosition;
      } else {
        newPositions[id] = draggedItemSnappedPosition;
      }
      return newPositions;
    });
  };

  return (
    <div ref={containerRef} className="relative h-full w-full touch-none">
      <canvas
        ref={bgRef}
        className="pointer-events-none absolute top-0 left-0 h-full w-full"
      />
      <DndContext
        sensors={sensors}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToParentElement]}
      >
        <div
          style={{
            position: 'relative',
            width: totalWidth * scale,
            height: totalHeight * scale,
            top: offsetY,
            left: offsetX,
          }}
        >
          {selectedFramesList.map((frame) => (
            <DraggableItem
              key={frame.id}
              id={frame.id}
              frame={frame}
              position={positions[frame.id] || { x: 0, y: 0 }}
              tileSize={
                tileSizes[frame.id] || {
                  w: maxContentW + 2 * padding,
                  h: maxContentH + 2 * padding,
                }
              }
              scale={scale}
              offsetX={0}
              offsetY={0}
              padding={padding}
              consistentSize={consistentSize}
              maxWidth={maxContentW}
              maxHeight={maxContentH}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
};
