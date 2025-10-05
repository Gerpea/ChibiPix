import { Frame } from '@/features/animation/model/types';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface TileSize {
  w: number;
  h: number;
}

export const useSpritesheetLayout = (
  selectedFramesList: Frame[],
  tileSizes: { [id: string]: TileSize },
  columns: number
) => {
  const [positions, setPositions] = useState<{
    [id: string]: { x: number; y: number };
  }>({});

  const gridCellSize = useMemo(() => {
    if (selectedFramesList.length === 0) return 32;
    const maxTileSize = Math.max(
      ...selectedFramesList.map((f) =>
        Math.max(tileSizes[f.id]?.w || 0, tileSizes[f.id]?.h || 0)
      )
    );
    return maxTileSize;
  }, [selectedFramesList, tileSizes]);

  useEffect(() => {
    setPositions((prev) => {
      const newPos: { [id: string]: { x: number; y: number } } = {};
      const currentIds = selectedFramesList.map((f) => f.id);
      const prevIds = Object.keys(prev).filter((id) => currentIds.includes(id));
      const sortedIds = prevIds.sort((a, b) => {
        const pa = prev[a];
        const pb = prev[b];
        if (pa.y !== pb.y) return pa.y - pb.y;
        return pa.x - pb.x;
      });
      const newAdded = currentIds.filter((id) => !prevIds.includes(id));
      const allSorted = [...sortedIds, ...newAdded];
      allSorted.forEach((id, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const tileW = tileSizes[id]?.w || gridCellSize;
        const tileH = tileSizes[id]?.h || gridCellSize;
        newPos[id] = {
          x: col * gridCellSize + (gridCellSize - tileW) / 2,
          y: row * gridCellSize + (gridCellSize - tileH) / 2,
        };
      });
      return newPos;
    });
  }, [selectedFramesList, tileSizes, columns, gridCellSize]);

  const autoArrange = useCallback(() => {
    const newPos: { [id: string]: { x: number; y: number } } = {};
    selectedFramesList.forEach((frame, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      const tileW = tileSizes[frame.id].w;
      const tileH = tileSizes[frame.id].h;
      newPos[frame.id] = {
        x: col * gridCellSize + (gridCellSize - tileW) / 2,
        y: row * gridCellSize + (gridCellSize - tileH) / 2,
      };
    });
    setPositions(newPos);
  }, [selectedFramesList, tileSizes, columns, gridCellSize]);

  return { positions, setPositions, gridCellSize, autoArrange };
};
